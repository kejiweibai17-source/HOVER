import React from "react";
import EmblaCarousel from "./EmblaCarousel";
import Header from "./Header";
import Footer from "./Footer";

const OPTIONS = { dragFree: true, loop: true };

// Define an array of slide objects with iframe content
const SLIDES = [
  {
    image: "/images/2491274-cover-Photoroom.png",
    title: "專利認可",
    description: "Description for the fourth slide.",
  },
  {
    image: "/images/xvnw49u2as4bcqrwta6caop56ozmi6re-Photoroom.png",
    title: "Third Slide",
    description: "Description for the third slide.",
  },
  {
    image: "/images/3c3vnce4cqjbowo0tetrzx0x2jbrrayr-Photoroom.png",
    title: "Third Slide",
    description: "Description for the third slide.",
  },
  {
    image: "/images/q71gmzmnk2uq6rk50al3guemsjmnkecw-Photoroom.png",
    title: "Fourth Slide",
    description: "Description for the fourth slide.",
  },
  {
    image: "/images/ultimate-max.jpg-Photoroom.png",
    title: "Fifth Slide",
    description: "Description for the fifth slide.",
  },
];

const App = () => (
  <>
    {/* Uncomment the lines below if you have header and footer components */}
    {/* <Header /> */}
    <EmblaCarousel slides={SLIDES} options={OPTIONS} />
    {/* <Footer /> */}
  </>
);

export default App;
