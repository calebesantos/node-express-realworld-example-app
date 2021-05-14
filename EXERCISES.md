# Exercise 1: Fix an error (10 min)

- Our endpoint `POST /api/article` is not working in production, it returns 500
- Our endpoint `GET /api/article` is not working in production, when we try to pass query string like `?`, it returns 500

# Exercise 2: Add new feature (15 min)

Now, we need to able to read/write comments in the posted articles.

We need to create two endpoints:

- `POST /api/articles/:article/comments`
- `GET /api/articles/:article/comments`

The Comment schema should be like this:

```
{
  body: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' }
}
```
