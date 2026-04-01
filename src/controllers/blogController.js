import Blog from '../models/Blog.js';

export const createBlog = async (req, res) => {
  try {
    const blogData = { ...req.body, createdBy: req.user._id };
    const blog = await Blog.create(blogData);
    res.status(201).json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (category) query.category = category;

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean();

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        totalBlogs: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.status(200).json({ success: true, blog });
};

export const deleteBlog = async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Blog Deleted' });
};
