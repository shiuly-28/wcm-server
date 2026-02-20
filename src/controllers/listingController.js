import Listing from '../models/Listing.js';
import fs from 'fs';
import path from 'path';

export const createListing = async (req, res) => {
  try {
    const { title, externalUrl, region, country, tradition, culturalTags } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const imageUrl = `/uploads/listings/${req.file.filename}`;

    const newListing = await Listing.create({
      creatorId: req.user._id,
      title,
      externalUrl,
      region,
      country,
      tradition,
      culturalTags: culturalTags ? culturalTags.split(',') : [],
      image: imageUrl,
    });

    res.status(201).json({ message: 'Listing created successfully', newListing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update' });
    }

    let updateData = { ...req.body };

    if (req.file) {
      const oldImagePath = path.join(process.cwd(), listing.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      updateData.image = `/uploads/listings/${req.file.filename}`;
    }

    const updatedListing = await Listing.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    res.status(200).json({ message: 'Listing updated', updatedListing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const imagePath = path.join(process.cwd(), listing.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Listing.findByIdAndDelete(id);
    res.status(200).json({ message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ creatorId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
