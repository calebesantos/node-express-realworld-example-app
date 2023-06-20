var router = require('express').Router();
var mongoose = require('mongoose');

var auth = require('../auth');

var Article = mongoose.model('Article');
var User = mongoose.model('User');

// Preload article objects on routes with ':article'
router.param('article', function (req, res, next, slug) {
  Article.findOne({ slug: slug })
    .populate('author')
    .then(function (article) {
      if (!article) { return res.sendStatus(404); }

      req.article = article;

      return next();
    }).catch(next);
});

router.get('/', auth.optional, function (req, res, next) {
  var query = {};
  var limit = 20;
  var offset = 0;

  if (typeof req.query.limit !== 'undefined') {
    limit = req.query.limit;
  }

  if (typeof req.query.offset !== 'undefined') {
    offset = req.query.offset;
  }

  if (typeof req.query.tag !== 'undefined') {
    query.tagList = { "$in": [req.query.tag] };
  }

  Promise.all([
    req.query.author ? User.findOne({ username: req.query.author }) : null,
    req.query.favorited ? User.findOne({ username: req.query.favorited }) : null
  ]).then(function (results) {
    var author = results[0];
    var favoriter = results[1];

    if (author) {
      query.author = author._id;
    }

    if (favoriter) {
      query._id = { $in: favoriter.favorites };
    } else if (req.query.favorited) {
      query._id = { $in: [] };
    }

    return Promise.all([
      Article.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({ createdAt: 'desc' })
        .populate('author')
        .exec(),
      Article.count(query).exec(),
      req.payload ? User.findById(req.auth.id) : null,
    ]).then(function (results) {
      var articles = results[0];
      var articlesCount = results[1];
      var user = results[2];

      return res.json({
        articles: articles.map(function (article) {
          return article.toJSONFor(user);
        }),
        articlesCount: articlesCount
      });
    });
  }).catch(next);
});

router.post('/', auth.required, function (req, res, next) {
  const user = User.findById(req.auth.id);
  if (!user) { return res.sendStatus(401); }

  var article = new Article(req.body.article);

  article.author = user;

  article.save();
  // console.log(article.author);
  return res.json({ article: article.toJSONFor(user) });
});

// return an article
router.get('/:article', auth.optional, function (req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.auth.id) : null,
    req.article.populate('author')
  ]).then(function (results) {
    var user = results[0];

    return res.json({ article: req.article.toJSONFor(user) });
  }).catch(next);
});

// update article
router.put('/:article', auth.required, function (req, res, next) {
  User.findById(req.auth.id).then(function (user) {
    if (req.article.author._id.toString() === req.auth.id.toString()) {
      if (typeof req.body.article.title !== 'undefined') {
        req.article.title = req.body.article.title;
      }

      if (typeof req.body.article.description !== 'undefined') {
        req.article.description = req.body.article.description;
      }

      if (typeof req.body.article.body !== 'undefined') {
        req.article.body = req.body.article.body;
      }

      if (typeof req.body.article.tagList !== 'undefined') {
        req.article.tagList = req.body.article.tagList
      }

      req.article.save().then(function (article) {
        return res.json({ article: article.toJSONFor(user) });
      }).catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

// delete article
router.delete('/:article', auth.required, function (req, res, next) {
  User.findById(req.auth.id).then(function (user) {
    if (!user) { return res.sendStatus(401); }

    if (req.article.author._id.toString() === req.auth.id.toString()) {
      return req.article.remove().then(function () {
        return res.sendStatus(204);
      });
    } else {
      return res.sendStatus(403);
    }
  }).catch(next);
});

module.exports = router;
