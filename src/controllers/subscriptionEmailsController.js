import SubscriptionEmails from '../models/SubscriptionEmails.js';

export const create = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const isEmailExist = await SubscriptionEmails.findOne({ email });

    if (isEmailExist) {
      return res.status(200).json({ message: 'You are already subscribed' });
    }

    await SubscriptionEmails.create({ email });

    return res.status(201).json({ message: 'Thank you for subscribing' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const allEmail = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sort = '-createdAt' } = req.query;

    const query = {
      email: { $regex: search, $options: 'i' },
    };

    const emails = await SubscriptionEmails.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort);

    const total = await SubscriptionEmails.countDocuments(query);

    return res.status(200).json({
      emails,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
