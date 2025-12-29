import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const reviews = [
  {
    name: "Zac L.",
    location: "Edmond, OK",
    text: "Next Generation Roofing did an outstanding job on our roof replacement. Professional, timely, and the quality of work exceeded our expectations. Highly recommend!",
    rating: 5,
  },
  {
    name: "Walter A.",
    location: "Tulsa, OK",
    text: "Best roofing experience I've ever had. The team was incredibly professional, and they helped me navigate the entire insurance claim process. My new roof looks amazing!",
    rating: 5,
  },
  {
    name: "Sarah M.",
    location: "Norman, OK",
    text: "From the initial inspection to the final cleanup, everything was handled with excellence. The crew was respectful, efficient, and did incredible work. Will definitely use again!",
    rating: 5,
  },
  {
    name: "Michael T.",
    location: "Moore, OK",
    text: "After storm damage, I was stressed about finding a reliable roofer. Next Generation made the process seamless. They dealt with my insurance and got me a brand new roof!",
    rating: 5,
  },
  {
    name: "Jennifer K.",
    location: "Yukon, OK",
    text: "Veteran-owned and it shows in their work ethic. They showed up on time, communicated throughout the process, and delivered exceptional results. Five stars all the way!",
    rating: 5,
  },
];

export function ReviewSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  return (
    <section className="bg-section-alt section-padding">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it. Here's what Oklahoma homeowners are saying about Next Generation Roofing.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Navigation Buttons */}
          <button
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 p-2 bg-background rounded-full shadow-lg hover:bg-secondary transition-colors"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 p-2 bg-background rounded-full shadow-lg hover:bg-secondary transition-colors"
            aria-label="Next review"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Review Card */}
          <div className="bg-background rounded-lg shadow-xl p-8 md:p-12 text-center">
            <Quote className="w-12 h-12 text-accent/30 mx-auto mb-6" />
            
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(reviews[currentIndex].rating)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-accent text-accent" />
              ))}
            </div>

            {/* Review Text */}
            <p className="text-lg md:text-xl text-foreground mb-8 leading-relaxed">
              "{reviews[currentIndex].text}"
            </p>

            {/* Reviewer Info */}
            <div>
              <p className="font-heading text-xl uppercase">{reviews[currentIndex].name}</p>
              <p className="text-muted-foreground">{reviews[currentIndex].location}</p>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setCurrentIndex(index);
                }}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? "bg-accent" : "bg-border"
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
