import mongoose from 'mongoose';
import Stripe from 'stripe';
import axios from 'axios';
import Transaction from '../models/Transaction.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- Real-time Exchange Rate Helper ---
const getExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    const from = fromCurrency.toLowerCase();
    const to = toCurrency.toLowerCase();
    if (from === to) return 1;

    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`
    );

    if (response.data && response.data.conversion_rate) {
      return response.data.conversion_rate;
    }
    return 1;
  } catch (error) {
    console.error('Exchange Rate Error:', error.message);
    return 1;
  }
};


// --- Create Checkout Session ---
export const createCheckoutSession = async (req, res) => {
  try {
    const { listingId, packageType, amount, currency, currentPath, days, totalClicks } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const paymentCurrency = currency || 'eur';
    const calculatedCPC =
      packageType === 'ppc' ? (Number(amount) / Number(totalClicks)).toFixed(4) : 0;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: paymentCurrency,
            product_data: {
              name: `${packageType.toUpperCase()} Promotion: ${listing.title}`,
              description:
                packageType === 'boost' ? `${days} Days Boost` : `${totalClicks} Clicks Credit`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}${currentPath || '/'}?success=true`,
      cancel_url: `${process.env.CLIENT_URL}${currentPath || '/'}?canceled=true`,
      metadata: {
        listingId,
        packageType,
        days: days ? days.toString() : '0',
        totalClicks: totalClicks ? totalClicks.toString() : '0',
        originalCpc: calculatedCPC.toString(),
        creatorId: req.user._id.toString(),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe Session Error:', error);
    res.status(500).json({ message: 'Payment failed' });
  }
};

// --- Ranking & Promotion Logic ---
const applyPromotionLogic = (listing, daysInput = null) => {
  let boostScore = 0;
  let ppcScore = 0;
  const now = new Date();

  // ১. Boost Intensity (টাকা / দিন)
  // যত কম দিনে যত বেশি টাকা, লেভেল তত হাই হবে।
  if (listing.promotion.boost.isActive && listing.promotion.boost.expiresAt > now) {
    const amount = listing.promotion.boost.amountPaid || 0;
    const expiry = new Date(listing.promotion.boost.expiresAt);

    // দিন বের করা (যদি নতুন পেমেন্ট হয় তবে ইনপুট দিন ব্যবহার করবে, নাহলে বাকি দিন)
    let daysDiff = daysInput;
    if (!daysDiff) {
      const diffTime = Math.abs(expiry - now);
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    // লজিক: (টোটাল টাকা / দিন) * মাল্টিপ্লায়ার
    boostScore = (amount / daysDiff) * 10;
  }

  // ২. PPC Priority (High CPC = High Level)
  // এখানে CPC-কে ৩০০ গুণ গুরুত্ব দেওয়া হয়েছে যাতে বাজেটের চেয়ে CPC-র প্রভাব বেশি থাকে।
  if (listing.promotion.ppc.isActive && listing.promotion.ppc.ppcBalance > 0) {
    const cpc = listing.promotion.ppc.costPerClick || 0.1;
    const balance = listing.promotion.ppc.ppcBalance || 0;

    // লজিক: (প্রতি ক্লিকের দাম * ৩০০) + (বাজেটের ৫%)
    // এর ফলে কেউ ১০ ইউরো দিয়ে ৫ ইউরো সিপিসি দিলে সে ১০০ ইউরো দিয়ে ০.১ সিপিসি দেওয়া ইউজারের চেয়ে উপরে থাকবে।
    ppcScore = cpc * 300 + balance * 0.05;
  }

  // ৩. ফাইনাল আপডেট
  listing.promotion.level = Math.floor(boostScore + ppcScore);

  const hasActivePpc = listing.promotion.ppc.isActive && listing.promotion.ppc.ppcBalance > 0;
  const hasActiveBoost =
    listing.promotion.boost.isActive && listing.promotion.boost.expiresAt > now;

  listing.isPromoted = !!(hasActivePpc || hasActiveBoost);

  // যদি কোনো প্রোমোশন একটিভ না থাকে তবে লেভেল ০
  if (!listing.isPromoted) listing.promotion.level = 0;

  return listing;
};

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { listingId, packageType, creatorId, days, totalClicks, originalCpc } = session.metadata;

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const amountPaid = session.amount_total / 100;
      const paymentCurrency = session.currency.toUpperCase();
      const targetCurrency = 'EUR';

      const fxRate = await getExchangeRate(paymentCurrency, targetCurrency);
      const amountInEUR = Number((amountPaid * fxRate).toFixed(2));

      const vatRate = 19;
      const vatAmountInEUR = Number((amountInEUR - amountInEUR / (1 + vatRate / 100)).toFixed(2));

      // ট্রানজেকশন তৈরি
      await Transaction.create(
        [
          {
            creator: creatorId,
            listing: listingId,
            stripeSessionId: session.id,
            amountPaid,
            currency: session.currency,
            fxRate,
            amountInEUR,
            packageType,
            status: 'completed',
            invoiceNumber: `INV-${Date.now()}`,
            vatAmount: vatAmountInEUR,
          },
        ],
        { session: dbSession }
      );

      const listing = await Listing.findById(listingId).session(dbSession);
      if (!listing) throw new Error('Listing not found');

      // পেমেন্ট ডাটা আপডেট
      if (packageType === 'boost') {
        listing.promotion.boost.isActive = true;
        listing.promotion.boost.amountPaid = amountInEUR;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(days));
        listing.promotion.boost.expiresAt = expiry;
      } else if (packageType === 'ppc') {
        listing.promotion.ppc.isActive = true;
        listing.promotion.ppc.ppcBalance = Number(
          ((listing.promotion.ppc.ppcBalance || 0) + amountInEUR).toFixed(2)
        );
        listing.promotion.ppc.amountPaid = Number(
          ((listing.promotion.ppc.amountPaid || 0) + amountInEUR).toFixed(2)
        );
        listing.promotion.ppc.totalClicks =
          (listing.promotion.ppc.totalClicks || 0) + parseInt(totalClicks);

        const cpcInEUR = Number((Number(originalCpc) * fxRate).toFixed(4));
        listing.promotion.ppc.costPerClick = cpcInEUR;
      }

      // র‍্যাঙ্কিং লজিক কল করা (days পাস করা হয়েছে সঠিক ক্যালকুলেশনের জন্য)
      applyPromotionLogic(listing, parseInt(days) || null);

      await listing.save({ session: dbSession });
      await dbSession.commitTransaction();

      console.log(`[Webhook] Success. New Level: ${listing.promotion.level}`);
    } catch (error) {
      await dbSession.abortTransaction();
      console.error('Webhook Error:', error);
    } finally {
      dbSession.endSession();
    }
  }
  res.json({ received: true });
};

// --- Generate Invoice ---
export const generateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id).populate('creator').populate('listing');
    if (!transaction) return res.status(404).send('Invoice not found');

    const doc = new jsPDF();
    const vatRate = parseFloat(process.env.DEFAULT_VAT_RATE) || 19;

    // পেমেন্ট করা অরিজিনাল কারেন্সিতে ভ্যাট হিসাব
    const netAmount = transaction.amountPaid / (1 + vatRate / 100);
    const vatValue = transaction.amountPaid - netAmount;

    // Header Design
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('OFFICIAL INVOICE', 15, 25);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Invoice: ${transaction.invoiceNumber}`, 15, 50);
    doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString()}`, 15, 55);

    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 140, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${transaction.creator.firstName} ${transaction.creator.lastName}`, 140, 55);
    doc.text(transaction.creator.email, 140, 60);

    autoTable(doc, {
      startY: 70,
      head: [['Service', 'Net', 'VAT', 'Total']],
      body: [
        [
          `${transaction.packageType.toUpperCase()} - ${transaction.listing.title}`,
          `${transaction.currency.toUpperCase()} ${netAmount.toFixed(2)}`,
          `${vatRate}%`,
          `${transaction.currency.toUpperCase()} ${transaction.amountPaid.toFixed(2)}`,
        ],
      ],
      headStyles: { fillColor: [249, 115, 22] },
    });

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).send('Error generating PDF');
  }
};
