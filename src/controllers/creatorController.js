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
      .reduce((acc, curr) => acc + (Number(curr.amountInEUR) || 0), 0) 
      .toFixed(2);

    const totalViews = listings.reduce((acc, curr) => acc + (curr.views || 0), 0);

    const totalExecutedClicks = listings.reduce(
      (acc, curr) => acc + (curr.promotion?.ppc?.executedClicks || 0),
      0
    );

    const totalPurchasedClicks = listings.reduce(
      (acc, curr) => acc + (curr.promotion?.ppc?.totalClicks || 0),
      0
    );

    const totalFavorites = listings.reduce((acc, curr) => acc + (curr.favorites?.length || 0), 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const analyticsData = await Analytics.find({
      creatorId,
      date: { $gte: sevenDaysAgo },
    }).lean();

    const chartData = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayRecord = analyticsData.find(
        (a) => new Date(a.date).toISOString().split('T')[0] === dateString
      );

      chartData.push({
        name: dayName,
        views: dayRecord ? dayRecord.views : 0,
        clicks: dayRecord ? dayRecord.clicks : 0,
      });
    }

    const stats = {
      totalListings: listings.length,
      totalViews,
      totalExecutedClicks, 
      totalPurchasedClicks, 
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

    const listing = await Listing.findOne({ _id: id, creatorId: userId })
      .select('title promotion views isPromoted image')
      .lean();

    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    const ppc = listing.promotion?.ppc || {};
    const boost = listing.promotion?.boost || {};
    const now = new Date();

    // --- PPC Calculation ---
    const totalPurchased = Number(ppc.totalClicks) || 0;
    const executed = Number(ppc.executedClicks) || 0;
    const remaining = Math.max(0, totalPurchased - executed);
    const consumptionRate =
      totalPurchased > 0 ? Number(((executed / totalPurchased) * 100).toFixed(1)) : 0;

    // --- Boost Calculation (Real-time Focus) ---
    let daysRemaining = 0;
    let hoursRemaining = 0;
    let isExpiringSoon = false;

    if (boost.isActive && boost.expiresAt) {
      const expiry = new Date(boost.expiresAt);
      const diffMs = expiry - now;

      if (diffMs > 0) {
        daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
        // যদি ২৪ ঘণ্টার কম থাকে
        if (hoursRemaining < 24) isExpiringSoon = true;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        title: listing.title,
        image: listing.image,
        isPromoted: !!listing.isPromoted,
        level: listing.promotion?.level || 0,
        views: listing.views || 0,
        ppc: {
          isActive: !!(ppc.isActive && ppc.ppcBalance > 0),
          balance: Number(ppc.ppcBalance || 0).toFixed(2),
          costPerClick: Number(ppc.costPerClick || 0.1).toFixed(2),
          totalPurchased,
          clicksUsed: executed,
          clicksRemaining: remaining,
          consumptionRate: Math.min(100, consumptionRate),
        },
        boost: {
          isActive: !!(boost.isActive && hoursRemaining > 0),
          expiresAt: boost.expiresAt,
          daysRemaining,
          hoursRemaining,
          isExpiringSoon,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
