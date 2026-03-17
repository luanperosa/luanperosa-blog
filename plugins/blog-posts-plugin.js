export default function blogPostsPlugin() {
  return {
    name: 'blog-posts-plugin',
    async allContentLoaded({allContent, actions}) {
      const {setGlobalData} = actions;
      const blogData = allContent['docusaurus-plugin-content-blog']?.default;
      const blogPosts = blogData?.blogPosts ?? [];

      const posts = blogPosts.map(({metadata}) => ({
        title: metadata.title,
        slug: metadata.permalink,
        date: metadata.date
          ? new Date(metadata.date).toISOString().slice(0, 10)
          : null,
        tags: metadata.tags.map((t) => ({
          label: t.label,
          permalink: t.permalink,
        })),
      }));

      setGlobalData({posts});
    },
  };
}
