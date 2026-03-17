import blogPostsPlugin from '../blog-posts-plugin.js';

function makeBlogPost({title, permalink, date, tags = []}) {
  return {
    id: permalink.replace('/blog/', ''),
    metadata: {
      title,
      permalink,
      date,
      tags: tags.map((t) =>
        typeof t === 'string'
          ? {label: t, permalink: `/blog/tags/${t.toLowerCase()}`}
          : t,
      ),
    },
  };
}

function makeAllContent(blogPosts = []) {
  return {
    'docusaurus-plugin-content-blog': {
      default: {blogPosts},
    },
  };
}

describe('blogPostsPlugin allContentLoaded', () => {
  let setGlobalData;
  let plugin;

  beforeEach(() => {
    setGlobalData = jest.fn();
    plugin = blogPostsPlugin();
  });

  it('has the correct plugin name', () => {
    expect(plugin.name).toBe('blog-posts-plugin');
  });

  it('maps blog posts from allContent', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'My Post',
        permalink: '/blog/my-post',
        date: '2024-01-15T00:00:00.000Z',
        tags: ['javascript'],
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    expect(setGlobalData).toHaveBeenCalledWith({
      posts: [
        {
          title: 'My Post',
          slug: '/blog/my-post',
          date: '2024-01-15',
          tags: [{label: 'javascript', permalink: '/blog/tags/javascript'}],
        },
      ],
    });
  });

  it('handles posts with multiple tags', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Tagged Post',
        permalink: '/blog/tagged',
        date: '2024-06-01T00:00:00.000Z',
        tags: ['react', 'typescript'],
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts[0].tags).toEqual([
      {label: 'react', permalink: '/blog/tags/react'},
      {label: 'typescript', permalink: '/blog/tags/typescript'},
    ]);
  });

  it('handles posts with no tags', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'No Tags',
        permalink: '/blog/no-tags',
        date: '2024-01-01T00:00:00.000Z',
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts[0].tags).toEqual([]);
  });

  it('extracts date (YYYY-MM-DD) from ISO string', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Date Test',
        permalink: '/blog/date-test',
        date: '2025-12-25T10:30:00.000Z',
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts[0].date).toBe('2025-12-25');
  });

  it('sets date to null when metadata date is missing', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'No Date',
        permalink: '/blog/no-date',
        date: null,
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts[0].date).toBeNull();
  });

  it('preserves order from blog plugin (newest first)', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Newest',
        permalink: '/blog/newest',
        date: '2024-12-31T00:00:00.000Z',
      }),
      makeBlogPost({
        title: 'Middle',
        permalink: '/blog/middle',
        date: '2024-06-15T00:00:00.000Z',
      }),
      makeBlogPost({
        title: 'Oldest',
        permalink: '/blog/oldest',
        date: '2024-01-01T00:00:00.000Z',
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts.map((p) => p.title)).toEqual(['Newest', 'Middle', 'Oldest']);
  });

  it('handles empty blog posts', async () => {
    const allContent = makeAllContent([]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    expect(setGlobalData).toHaveBeenCalledWith({posts: []});
  });

  it('handles missing blog plugin content gracefully', async () => {
    const allContent = {};

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    expect(setGlobalData).toHaveBeenCalledWith({posts: []});
  });

  it('uses permalink as slug', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Custom Slug',
        permalink: '/blog/custom-slug',
        date: '2024-01-01T00:00:00.000Z',
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts[0].slug).toBe('/blog/custom-slug');
  });

  it('preserves tag label and permalink from blog plugin', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Tag Test',
        permalink: '/blog/tag-test',
        date: '2024-01-01T00:00:00.000Z',
        tags: [
          {label: 'Personal', permalink: '/blog/tags/personal'},
          {label: 'Learning', permalink: '/blog/tags/learning'},
        ],
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts[0].tags).toEqual([
      {label: 'Personal', permalink: '/blog/tags/personal'},
      {label: 'Learning', permalink: '/blog/tags/learning'},
    ]);
  });

  it('maps a post created at blog root (e.g. blog/2026-03-16-something.md)', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Root Post',
        permalink: '/blog/something',
        date: '2026-03-16T00:00:00.000Z',
        tags: ['personal'],
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts).toEqual([
      {
        title: 'Root Post',
        slug: '/blog/something',
        date: '2026-03-16',
        tags: [{label: 'personal', permalink: '/blog/tags/personal'}],
      },
    ]);
  });

  it('maps a post created under a year folder (e.g. blog/2027/2027-03-16-something.md)', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Future Post',
        permalink: '/blog/something',
        date: '2027-03-16T00:00:00.000Z',
        tags: ['learning'],
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts).toEqual([
      {
        title: 'Future Post',
        slug: '/blog/something',
        date: '2027-03-16',
        tags: [{label: 'learning', permalink: '/blog/tags/learning'}],
      },
    ]);
  });

  it('maps posts from mixed folder structures together', async () => {
    const allContent = makeAllContent([
      makeBlogPost({
        title: 'Year Folder Post',
        permalink: '/blog/year-post',
        date: '2028-01-01T00:00:00.000Z',
      }),
      makeBlogPost({
        title: 'Root Post',
        permalink: '/blog/root-post',
        date: '2027-06-15T00:00:00.000Z',
      }),
    ]);

    await plugin.allContentLoaded({allContent, actions: {setGlobalData}});

    const posts = setGlobalData.mock.calls[0][0].posts;
    expect(posts.map((p) => p.title)).toEqual([
      'Year Folder Post',
      'Root Post',
    ]);
  });
});
