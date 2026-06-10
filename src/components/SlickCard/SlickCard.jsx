import React from "react";
// react component for creating beautiful carousel
import Carousel from "react-slick";

// --- 【修正】匯入 react-slick 的 CSS 樣式 ---
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// --- 【修正】匯入 Material-UI/MUI 的組件和圖示 ---

// @material-ui/icons
// 從 @mui/icons-material 匯入 LocationOn 圖示
import LocationOn from "@mui/icons-material/LocationOn";

// core components
// 假設這些是您專案中的自訂組件或來自特定路徑的組件
// 如果路徑不同，請根據您的專案結構進行修改
import GridContainer from "components/Grid/GridContainer.js";
import GridItem from "components/Grid/GridItem.js";
import Card from "components/Card/Card.js";

export default function SectionCarousel() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
  };

  return (
    <>
      {/* 【建議】為 react-slick 的自訂 class 提供一些基本樣式 */}
      <style jsx global>{`
        .slick-image {
          width: 100%;
          height: 500px; /* 您可以自訂高度 */
          object-fit: cover;
        }
        .slick-caption {
          position: absolute;
          bottom: 20px;
          left: 20px;
          color: white;
          background-color: rgba(0, 0, 0, 0.5);
          padding: 10px 15px;
          border-radius: 8px;
        }
        .slick-caption h4 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
        }
        .slick-icons {
          font-size: 1.2rem;
        }
        .slick-dots {
          bottom: -30px;
        }
      `}</style>

      <GridContainer>
        <GridItem xs={12} sm={12} md={8} style={{ margin: "0 auto" }}>
          {" "}
          {/* 讓輪播在中間 */}
          <Card>
            <Carousel {...settings}>
              <div>
                <img
                  src="https://demos.creative-tim.com/nextjs-material-kit/img/bg.jpg"
                  alt="First slide: Yellowstone National Park"
                  className="slick-image"
                />
                <div className="slick-caption">
                  <h4>
                    <LocationOn className="slick-icons" />
                    Yellowstone National Park, United States
                  </h4>
                </div>
              </div>
              <div>
                <img
                  src="https://demos.creative-tim.com/nextjs-material-kit/img/bg2.jpg"
                  alt="Second slide: A beautiful landscape somewhere in United States"
                  className="slick-image"
                />
                <div className="slick-caption">
                  <h4>
                    <LocationOn className="slick-icons" />
                    Somewhere Beyond, United States
                  </h4>
                </div>
              </div>
              <div>
                <img
                  src="https://demos.creative-tim.com/nextjs-material-kit/img/bg3.jpg"
                  alt="Third slide: Another view of Yellowstone National Park"
                  className="slick-image"
                />
                <div className="slick-caption">
                  <h4>
                    <LocationOn className="slick-icons" />
                    Yellowstone National Park, United States
                  </h4>
                </div>
              </div>
            </Carousel>
          </Card>
        </GridItem>
      </GridContainer>
    </>
  );
}
