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
    name: "Michael Thompson",
    rating: 5,
    date: "1 month ago",
    text: "Had storm damage and these guys handled everything with my insurance company. Dustin was incredibly professional and kept me informed every step of the way. The crew showed up on time and finished the job in one day. Highly recommend!",
    service: "Storm Damage",
  },
  {
    name: "Sarah Johnson",
    rating: 5,
    date: "2 months ago",
    text: "From start to finish, Next Generation Roofing exceeded my expectations. They were honest, transparent about pricing, and the quality of work was outstanding. My neighbors have already asked for their contact info!",
    service: "Roof Replacement",
  },
  {
    name: "Robert Williams",
    rating: 5,
    date: "3 months ago",
    text: "As a business owner, I needed a commercial roofing company I could trust. Next Generation delivered on every promise. Professional crew, minimal disruption to our operations, and excellent communication throughout the project.",
    service: "Commercial Roofing",
  },
  {
    name: "Jennifer Martinez",
    rating: 5,
    date: "1 month ago",
    text: "Great company. Easy to work with and would recommend to anyone needing roof repair. The team was respectful of our property and cleaned up everything when they were done. Top-notch service!",
    service: "Roof Repair",
  },
  {
    name: "David Anderson",
    rating: 5,
    date: "2 months ago",
    text: "After getting several quotes, Next Generation offered the best value and quality. Jonathan walked me through all my options and never pressured me. The installation was flawless and they even helped with the insurance paperwork.",
    service: "Insurance Claim",
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
        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-6">
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