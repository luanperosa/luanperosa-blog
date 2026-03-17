import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

function BlogPostItem({title, slug, date, tags}) {
  return (
    <article className={styles.blogPostItem}>
      <Heading as="h2">
        <Link to={slug}>{title}</Link>
      </Heading>
      <time className={styles.blogPostDate}>{date}</time>
      <div className={styles.blogPostTags}>
        {tags.map((tag) => (
          <Link
            key={tag.permalink}
            className={styles.blogPostTag}
            to={tag.permalink}>
            {tag.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

export default function HomepageFeatures() {
  const {posts} = usePluginData('blog-posts-plugin');
  return (
    <section className={styles.blogList}>
      <div className="container">
        {posts.map((post) => (
          <BlogPostItem key={post.slug} {...post} />
        ))}
      </div>
    </section>
  );
}
