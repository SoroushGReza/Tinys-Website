import React, { useState, useEffect } from "react";
import Calendar from "react-calendar"; // Importera kalenderkomponenten
import 'react-calendar/dist/Calendar.css'; // Kalenderns CSS
import { axiosReq } from "../api/axiosDefaults"; // Axios inst�llningar
import { Container, Row, Col, Button, Alert } from "react-bootstrap";

const Bookings = () => {
    const [date, setDate] = useState(new Date()); // H�ller det valda datumet
    const [availableTimes, setAvailableTimes] = useState([]); // Lista med tillg�ngliga tider
    const [bookedTimes, setBookedTimes] = useState([]); // Lista med bokade tider
    const [bookingSuccess, setBookingSuccess] = useState(false); // F�r att visa om bokningen lyckades

    // H�mtar tillg�ngliga och bokade tider fr�n API
    useEffect(() => {
        const fetchTimes = async () => {
            try {
                const { data: availability } = await axiosReq.get("/availability/");
                const { data: bookings } = await axiosReq.get("/bookings/list/");

                // Extrahera tillg�ngliga och bokade tider fr�n svaren
                setAvailableTimes(availability);
                setBookedTimes(bookings.map(booking => booking.date)); // Anta att 'date' �r i formatet 'YYYY-MM-DD'
            } catch (err) {
                console.error("Error fetching times:", err);
            }
        };

        fetchTimes();
    }, []);

    // N�r anv�ndaren klickar p� en tillg�nglig tid
    const handleBooking = async (date) => {
        try {
            await axiosReq.post("/bookings/create/", { date });
            setBookingSuccess(true);
        } catch (err) {
            console.error("Error booking time:", err);
        }
    };

    // Funktion som best�mmer om en dag �r tillg�nglig eller redan bokad
    const isTileDisabled = ({ date }) => {
        const formattedDate = date.toISOString().split('T')[0]; // Formatera datumet till YYYY-MM-DD

        // Om datumet inte finns i availableTimes eller om det redan �r bokat, blockera det
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
                        tileDisabled={isTileDisabled} // Anv�nds f�r att g�ra redan bokade dagar otillg�ngliga
                    />
                    <Button
                        onClick={() => handleBooking(date)}
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
