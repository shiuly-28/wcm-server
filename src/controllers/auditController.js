import AuditLog from "../models/AuditLog.js";

export const getCreatorAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .populate('targetId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const logs = await AuditLog.find()
      .populate('user', 'name email role') // ইউজারের নাম ও ইমেইলসহ
      .populate('targetId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments();

    res.status(200).json({
      success: true,
      logs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};