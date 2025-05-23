const express = require('express');
const multer = require('multer');
const { Post } = require('../models/post.model.js')
const mongoose = require('mongoose');
const Comment = require('../models/comment.model.js');
const requireAuth = require('../middleware/requireAuth.js');
const fs = require('fs').promises;


function makePostsRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const type = req.query.type;
    const query = type ? { type } : {}; // ← no filter = return all types

    try {
      const posts = await Post.find(query).sort({ createdAt: -1 }).populate('user_id', 'username');
      res.json(posts);
    } catch (err) {
      console.error("GET /posts error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/sameNeighbourhood', async (req, res) => {
    const { neighbourhood } = req.query;
    if (!neighbourhood) return res.status(400).json({ error: 'Neighbourhood is required' });
    

    try {
    
      const posts = await Post.find({ userNeighbourhood: req.session.neighbourhood.toLowerCase() })
        .populate('user_id', 'username').sort({ createdAt: -1 })


      res.json(posts);
    } catch (err) {
      console.error("GET /posts/sameNeighbourhood error:", err);
      res.status(500).json({ error: err.message });
    }
  });


  router.get('/me', requireAuth, async (req, res) => {
    const posts = await Post.find({ user_id: req.session.userId }).sort({ createdAt: -1 });
    res.json(posts);
  });

  router.get('/:id', async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    res.json(post);
  });

  router.post('/:id/like', requireAuth, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    
    const userId = req.session.userId;
    const alreadyLiked = post.likes.some(id => id.equals(userId));
    if (alreadyLiked) {
      post.likes = post.likes.filter(id => !id.equals(userId)); // unlike
    } else {
      post.likes.push(userId); // like
    }

    await post.save();

    res.json({ likesCount: post.likes.length, liked: !alreadyLiked });
  });

  router.get('/:id/like', requireAuth, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    const liked = post.likes.some(id => id.equals(req.session.userId));
    res.json({ likesCount: post.likes.length, liked });
  });

  // GET /posts/user/:id
  router.get('/users/:id', async (req, res) => {

    try {
      const posts = await Post.find({ user_id: req.params.id }).sort({ createdAt: -1 });
      //console.log('Fetched posts for user:', req.params.id, posts);
      res.json(posts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });


  router.put('/:id', async (req, res) => {
    try {
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!post) return res.status(404).json({ error: 'Not found' });
      res.json(post);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ error: 'Not found' });

      // Delete related comments
      await Comment.deleteMany({ parent_id: post._id });

      // Delete uploaded image file from disk
      if (post.image_url && post.image_url.startsWith('/uploads/')) {
        const imgPath = path.join(__dirname, '../public', post.image_url);
        try {
          await fs.unlink(imgPath);
        } catch (err) {
          console.warn('Failed to delete image:', imgPath, err.message);
        }
      }

      await mongoose.model(post.constructor.modelName).deleteOne({ _id: post._id });
      res.status(204).end();
    } catch (err) {
      console.error('Error deleting post:', err);
      res.status(500).json({ error: err.message });
    }
  });
  return router;
}

module.exports = makePostsRouter;