import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import { axiosReq } from "../api/axiosDefaults";
import { Container, Row, Col, Button, Alert } from "react-bootstrap";

const Bookings = () => {
    const [date, setDate] = useState(new Date());
    const [availableTimes, setAvailableTimes] = useState([]);
    const [bookedTimes, setBookedTimes] = useState([]);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // H�mtar tillg�ngliga och bokade tider fr�n API
    useEffect(() => {
        const fetchTimes = async () => {
            try {
                const { data: availability } = await axiosReq.get("/availability/");
                const { data: bookings } = await axiosReq.get("/bookings/mine/");

                // Visa svar i konsolen f�r fels�kning
                console.log('Availability:', availability);
                console.log('Bookings:', bookings);

                // Extrahera tillg�ngliga tider och bokade tider
                setAvailableTimes(availability.map(item => item.date)); // L�gger till tillg�ngliga datum
                setBookedTimes(bookings.map(booking => booking.date)); // L�gger till bokade datum
            } catch (err) {
                console.error("Error fetching times:", err);
            }
        };

        fetchTimes();
    }, []);

    // N�r anv�ndaren klickar p� en tillg�nglig tid
    const handleBooking = async (selectedDate) => {
        try {
            await axiosReq.post("/bookings/", { date: selectedDate });
            setBookingSuccess(true);
        } catch (err) {
            console.error("Error booking time:", err);
        }
    };

    // Best�mmer om en dag �r tillg�nglig eller redan bokad
    const isTileDisabled = ({ date }) => {
        const formattedDate = date.toISOString().split('T')[0];

        // Blockera om datumet inte finns i availableTimes eller redan �r bokat
        return !availableTimes.includes(formattedDate) || bookedTimes.includes(formattedDate);
    };

    return (
        <Container>
            <Row className="justify-content-center">
                <Col md={8}>
                    <h2>V�lj en tid f�r att boka</h2>
                    {bookingSuccess && <Alert variant="success">Bokning genomf�rd!</Alert>}

                    <Calendar
                        onChange={setDate}
                        value={date}
                        tileDisabled={isTileDisabled}
                    />
                    <Button
                        onClick={() => handleBooking(date.toISOString().split('T')[0])}
                        disabled={bookedTimes.includes(date.toISOString().split('T')[0])}
                        className="mt-3"
                    >
                        Boka vald tid
                    </Button>
                </Col>
            </Row>
        </Container>
    );
};

export default Bookings;
