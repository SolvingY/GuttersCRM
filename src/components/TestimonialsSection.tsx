import { useState } from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Penny Meier",
    rating: 5,
    date: "3 months ago",
    text: "Our salesman Brad L. did a great job at keeping us updated through the entire process. Our roof was off, and replaced within 8 hrs, and you would have never known the crew was there. They left our property better than when they showed up!!",
    service: "Roof Replacement",
  },
  {
    name: "Wanda Minter",
    rating: 5,
    date: "2 months ago",
    text: "Next generation roofing did my new roof and gutters. They were very professional all the way especially Andre Runnels, always returned my calls and walked me through the process of what would happen in a timely manner. I love my new roof beautiful gutters. I am very pleased with the job they done.",
    service: "Roof & Gutters",
  },
  {
    name: "Curtis Baker",
    rating: 5,
    date: "4 months ago",
    text: "I needed a new roof put on before our mortgage company would close the loan on our house. Next generation expedited the process, worked with the insurance company and did a beautiful job. The cleanup after was fantastic. If you want a local company that cares, choose Next Generation!",
    service: "Insurance Claim",
  },
  {
    name: "Satisfied Homeowner",
    rating: 5,
    date: "Recent",
    text: "Great company. Easy to work with & would recommend to anyone needing roof repair. Professional team that gets the job done right the first time.",
    service: "Roof Repair",
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="testimonials" className="section-padding bg-section-alt">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-accent mb-4">
            <Quote className="w-5 h-5" />
            <span className="font-heading text-sm uppercase tracking-wider">
              Customer Reviews
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading uppercase mb-4">
            What Our <span className="text-accent">Customers Say</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-accent text-accent" />
              ))}
            </div>
            <span className="font-heading text-2xl">4.9</span>
            <span className="text-muted-foreground">/ 5 from 248+ Google Reviews</span>
          </div>
        </div>

        {/* Featured Testimonial - Mobile Carousel */}
        <div className="lg:hidden relative">
          <div className="bg-card border border-border rounded-xl p-6 md:p-8">
            <Quote className="w-10 h-10 text-accent/30 mb-4" />
            <div className="flex gap-1 mb-4">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-lg leading-relaxed mb-6">
              "{testimonials[currentIndex].text}"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading uppercase text-lg">{testimonials[currentIndex].name}</p>
                <p className="text-muted-foreground text-sm">{testimonials[currentIndex].service} • {testimonials[currentIndex].date}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevTestimonial}
                  className="p-2 rounded-full bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="p-2 rounded-full bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-accent' : 'bg-muted-foreground/30'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-xl transition-shadow"
            >
              <Quote className="w-8 h-8 text-accent/30 mb-4" />
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                "{testimonial.text}"
              </p>
              <div className="border-t border-border pt-4">
                <p className="font-heading uppercase">{testimonial.name}</p>
                <p className="text-muted-foreground text-sm">{testimonial.service} • {testimonial.date}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="https://share.google/APxY30i8K9jflKJOx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-heading uppercase text-sm hover:bg-accent/90 transition-colors"
          >
            <Star className="w-4 h-4" />
            Read More Reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
}