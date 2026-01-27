import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

// Configuration array - easy to update with new posts
// To update: replace imageUrl with new image path and update permalink
const instagramPosts = [
  {
    id: '1',
    imageUrl: '/instagram/post1.jpg',
    permalink: 'https://instagram.com/nextgenroofingok',
    caption: 'Quality roofing installation'
  },
  {
    id: '2',
    imageUrl: '/instagram/post2.jpg',
    permalink: 'https://instagram.com/nextgenroofingok',
    caption: 'Storm damage repair'
  },
  {
    id: '3',
    imageUrl: '/instagram/post3.jpg',
    permalink: 'https://instagram.com/nextgenroofingok',
    caption: 'Commercial roofing project'
  },
  {
    id: '4',
    imageUrl: '/instagram/post4.jpg',
    permalink: 'https://instagram.com/nextgenroofingok',
    caption: 'Residential roof replacement'
  },
  {
    id: '5',
    imageUrl: '/instagram/post5.jpg',
    permalink: 'https://instagram.com/nextgenroofingok',
    caption: 'Gutter installation'
  },
  {
    id: '6',
    imageUrl: '/instagram/post6.jpg',
    permalink: 'https://instagram.com/nextgenroofingok',
    caption: 'Before and after transformation'
  },
];

const INSTAGRAM_PROFILE_URL = 'https://instagram.com/nextgenroofingok';

export function InstagramGallery() {
  return (
    <section className="bg-section-alt section-padding">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram className="w-8 h-8 md:w-10 md:h-10 text-accent" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading uppercase">
              Follow Us On Instagram
            </h2>
          </div>
          <a 
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg md:text-xl text-muted-foreground hover:text-accent transition-colors font-heading"
          >
            @nextgenroofingok
          </a>
        </div>

        {/* Grid of Posts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {instagramPosts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              <img
                src={post.imageUrl}
                alt={post.caption}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  // Fallback to placeholder if image doesn't exist
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <p className="text-white text-xs sm:text-sm line-clamp-2 font-body">
                  {post.caption}
                </p>
              </div>
              {/* Instagram gradient border effect on hover */}
              <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-hover:ring-accent transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-8 md:mt-12">
          <a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="cta" size="lg" className="gap-2">
              <Instagram className="w-5 h-5" />
              Follow Us on Instagram
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
