import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "../styles/Home.module.css";
import backgroundImage from "../assets/home-bg.png";
import headerImage from "../assets/header-bg.png";
import Menu from "../components/Menu";

const Home = () => {
  return (
    <div
      className={styles.homeContainer}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <Container className={styles.contentContainer}>
        <Row className="align-items-center pt-5">
          <Col
            xs={12}
            md={6}
            className="text-center d-flex flex-column align-items-center"
          >
            <img
              src={headerImage}
              alt="Profile"
              className={styles.headerImage}
            />
            <h1 className={styles.mainHeading}>A NORDIC COMPANY</h1>
            <p className={styles.subText}>IN THE COMPANY OF NORDIC BEAUTY</p>
          </Col>
          <Col xs={12} md={6} className={`text-center ${styles.menuContainer}`}>
            <Menu />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Home;
