import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {portfolioItems} from '../data/portfolio';
import styles from './portfolio.module.css';

export default function Portfolio() {
  return (
    <Layout
      title="Luan Perosa - Portfolio"
      description="Showcase of my work and projects in web development.">
      <main className={styles.portfolioPage}>
        <div className={styles.hero}>
          <Heading as="h1">Portfolio</Heading>
          <p>A collection of projects I've worked on.</p>
        </div>
        <div className={styles.grid}>
          {portfolioItems.map((item) => (
            <article key={item.title} className={styles.card}>
              <div className={styles.cardHeader}>
                <Heading as="h2" className={styles.cardTitle}>
                  {item.title}
                </Heading>
              </div>
              <img
                src={item.image}
                alt={`${item.title} screenshot`}
                className={styles.image}
              />
              <div className={styles.content}>
                <p className={styles.description}>{item.description}</p>
                {item.bullets.length > 0 && (
                  <ul className={styles.bullets}>
                    {item.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {item.url && (
                  <p className={styles.url}>
                    <a
                      href={`https://${item.url}`}
                      target="_blank"
                      rel="noopener noreferrer">
                      {item.url}
                    </a>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </Layout>
  );
}
