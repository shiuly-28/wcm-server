import Comment from '../models/Comment.js';

export const createComment = async (req, res) => {
  try {
    const { blogId, text, parentCommentId } = req.body;

    const commentData = {
      blogId,
      text,
      user: req.user._id,
      parentComment: parentCommentId || null,
      isAdminReply: req.user.role === 'admin', 
    };

    const comment = await Comment.create(commentData);
    await comment.populate('user', 'firstName lastName image');

    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogComments = async (req, res) => {
  try {
    const comments = await Comment.find({ blogId: req.params.blogId, parentComment: null })
      .populate('user', 'firstName lastName image role')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'firstName lastName image role' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (req.user.role === 'admin' || comment.user.toString() === req.user._id.toString()) {
      await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentComment: comment._id }] });
      return res.status(200).json({ success: true, message: 'Comment and its replies removed' });
    }

    res.status(403).json({ message: 'Unauthorized' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
