import Listing from '../models/Listing.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Analytics from '../models/Analytics.js';

export const getCreatorDashboardStats = async (req, res) => {
  try {
    const creatorId = req.user._id;

    const [user, listings, transactions] = await Promise.all([
      User.findById(creatorId).select('walletBalance'),
      Listing.find({ creatorId }),
      Transaction.find({ creator: creatorId, status: 'completed' }),
    ]);

    const totalSpent = transactions
      .reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0)
      .toFixed(2);

    const totalViews = listings.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalPaidClicks = listings.reduce(
      (acc, curr) => acc + (curr.promotion?.ppc?.totalClicks || 0),
      0
    );
    const totalFavorites = listings.reduce((acc, curr) => acc + (curr.favorites?.length || 0), 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const analyticsData = await Analytics.find({
      creatorId,
      date: { $gte: sevenDaysAgo },
    });

    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayRecord = analyticsData.find((a) => new Date(a.date).getTime() === d.getTime());

      chartData.push({
        name: dayName,
        views: dayRecord ? dayRecord.views : 0,
        clicks: dayRecord ? dayRecord.clicks : 0,
      });
    }

    const stats = {
      totalListings: listings.length,
      totalViews,
      totalPaidClicks,
      totalFavorites,
      activePromotions: listings.filter((l) => l.isPromoted).length,

      totalSpent,
      walletBalance: (Number(user?.walletBalance) || 0).toFixed(2),

      totalPpcBalance: listings
        .reduce((acc, curr) => acc + (curr.promotion?.ppc?.ppcBalance || 0), 0)
        .toFixed(2),

      statusCount: {
        approved: listings.filter((l) => l.status === 'approved').length,
        pending: listings.filter((l) => l.status === 'pending').length,
        rejected: listings.filter((l) => l.status === 'rejected').length,
      },

      chartData: chartData,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message,
    });
  }
};

export const getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ creator: req.user._id })
      .populate('listing', 'title image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Transaction Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
    });
  }
};

export const getPromotionAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // ১. আপনার ড্যাশবোর্ড কোড অনুযায়ী ফিল্ডের নাম 'creatorId' ব্যবহার করা হয়েছে।
    // এখানে .lean() ব্যবহারের ফলে আমরা সরাসরি অবজেক্ট মডিফাই করতে পারবো।
    const listing = await Listing.findOne({ _id: id, creatorId: userId })
      .select('title promotion views isPromoted image')
      .lean();

    // লিস্টিং না পাওয়া গেলে বা আইডি ভুল হলে
    if (!listing) {
      console.log(`Listing not found for ID: ${id} and Creator: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Node not found or you are not authorized to view its insights.',
      });
    }

    // ২. Promotion অবজেক্ট না থাকলে ডিফাল্ট ভ্যালু সেট করা (যাতে কোড ক্র্যাশ না করে)
    const promotion = listing.promotion || { ppc: {}, boost: {}, level: 0 };
    const ppc = promotion.ppc || {};
    const boost = promotion.boost || {};

    // ৩. PPC ক্যালকুলেশন
    const totalPurchasedClicks = Number(ppc.totalClicks) || 0;
    const costPerClick = Number(ppc.costPerClick) || 0;
    const currentBalance = Number(ppc.ppcBalance) || 0;

    // কত ক্লিক বাকি আছে
    const clicksRemaining =
      costPerClick > 0 ? Math.max(0, Math.floor(currentBalance / costPerClick)) : 0;

    // কত ক্লিক খরচ হয়েছে
    const clicksUsed = Math.max(0, totalPurchasedClicks - clicksRemaining);

    // কত পারসেন্ট বাজেট শেষ হয়েছে
    const consumptionRate =
      totalPurchasedClicks > 0 ? ((clicksUsed / totalPurchasedClicks) * 100).toFixed(1) : 0;

    // ৪. Boost ক্যালকুলেশন
    let daysRemaining = 0;
    let boostProgress = 0;

    if (boost.isActive && boost.expiresAt) {
      const now = new Date();
      const expiry = new Date(boost.expiresAt);
      const diffTime = expiry - now;
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // আমরা ধরে নিচ্ছি সর্বোচ্চ ৩০ দিনের প্যাকেজ (অথবা আপনার লজিক অনুযায়ী দিন দিতে পারেন)
      boostProgress = Math.min(100, Math.max(0, (daysRemaining / 30) * 100));
    }

    // ৫. সাকসেস রেসপন্স
    res.status(200).json({
      success: true,
      data: {
        title: listing.title,
        image: listing.image,
        isPromoted: listing.isPromoted || false,
        level: promotion.level || 0,
        views: listing.views || 0,
        ppc: {
          isActive: !!(ppc.isActive && currentBalance > 0),
          balance: currentBalance.toFixed(2),
          costPerClick: costPerClick.toFixed(2),
          totalPurchasedClicks,
          clicksUsed,
          clicksRemaining,
          consumptionRate: Number(consumptionRate),
        },
        boost: {
          isActive: !!(boost.isActive && daysRemaining > 0),
          expiresAt: boost.expiresAt,
          daysRemaining,
          amountPaid: boost.amountPaid || 0,
          boostProgress: Number(boostProgress.toFixed(1)),
        },
      },
    });
  } catch (error) {
    console.error('Analytics Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load promotion data due to server error',
    });
  }
};