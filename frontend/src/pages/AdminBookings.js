import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Button, Form, Alert, Modal, Collapse } from "react-bootstrap";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format } from "date-fns-tz";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { axiosReq } from "../api/axiosDefaults";
import styles from "../styles/Bookings.module.css";
import { parseISO } from "date-fns";
import { useMediaQuery } from 'react-responsive';
import { useNavigate } from "react-router-dom";


const locales = {
    "en-IE": require("date-fns/locale/en-IE"),
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Booking Instructions
function BookingInfoDropdown() {
    const [open, setOpen] = useState(false);
    const infoRef = useRef(null);

    // Detect click outside of dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (infoRef.current && !infoRef.current.contains(event.target)) {
                setOpen(false); // Close dropdown
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    return (
        <>
            {!open && (
                <Button
                    onClick={() => setOpen(!open)}
                    aria-controls="booking-info"
                    aria-expanded={open}
                    variant="info"
                    className={`mt-5 ${styles["booking-info-button"]}`}
                >
                    Show booking instructions
                </Button>
            )}

            <Collapse in={open}>
                <div id="booking-info" className="mt-3" ref={infoRef}>
                    <Alert variant="info" className={styles["booking-info-alert"]}>
                        <strong>How to book:</strong>
                        <ul className={styles["booking-info-list"]}>
                            <li>1. Select one or more services by checking the boxes.</li>
                            <li>2. Scroll down to the calendar and choose an available time slot.</li>
                            <li>3. Once both steps are completed, click "Book Services" to finalize your booking.</li>
                        </ul>
                    </Alert>
                </div>
            </Collapse>
        </>
    );
}

// Show Date and day / Date based on screen size
const CustomHeader = ({ date }) => {
    const isMobile = useMediaQuery({ query: '(max-width: 992px)' });
    const day = getDay(date);

    // Determine the class based on the day
    const headerClass =
        day === 0 || day === 6 // Sunday or Saturday
            ? styles['weekend-header']
            : styles['weekday-header'];

    // Format date based on screen size
    const formattedDate = isMobile ? format(date, 'dd') : format(date, 'dd EEE'); // Show only day for mobile

    return (
        <div className={headerClass}>
            <button type="button" className="rbc-button-link">
                <span role="columnheader" aria-sort="none">{formattedDate}</span>
            </button>
        </div>
    );
};

// Function to convert "HH:MM:SS" to minutes
const parseWorktimeToMinutes = (worktime) => {
    const [hours, minutes, seconds] = worktime.split(':').map(Number);
    return hours * 60 + minutes + seconds / 60;
};

// Calculate total duration of selected services
const calculateBookingDuration = (services) => {
    const totalMinutes = services.reduce((total, service) => {
        return total + parseWorktimeToMinutes(service.worktime);
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim();
};


// Convert Worktime to Readable Format 
const convertWorktimeToReadableFormat = (worktime) => {
    const [hours, minutes] = worktime.split(':').map(Number);
    return `${hours > 0 ? `${hours}h` : ''} ${minutes > 0 ? `${minutes} minutes` : ''}`.trim();
}

// Calculate total price for chosen services
const calculateTotalPrice = (services) => {
    return services.reduce((total, service) => total + parseFloat(service.price), 0);
};

const AdminBookings = () => {
    const [services, setServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [selectedTime, setSelectedTime] = useState(null);
    const [totalWorktime, setTotalWorktime] = useState(0); // Storing total worktime
    const [allEvents, setAllEvents] = useState([]);
    const [totalDuration, setTotalDuration] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    // eslint-disable-next-line no-unused-vars
    const [userTimezoneOffset, setUserTimezoneOffset] = useState(0);
    const [timezoneMessage, setTimezoneMessage] = useState("");
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [currentBooking, setCurrentBooking] = useState(null);
    const [users, setUsers] = useState([]);
    const [modalSelectedServices, setModalSelectedServices] = useState([]);
    const navigate = useNavigate();
    const [showConfirmModal, setShowConfirmModal] = useState(false);


    // Check admin status of user 
    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const { data: user } = await axiosReq.get("/accounts/profile/");

                // Check id user is NOT admin, if NOT redirect
                if (!user.is_staff && !user.is_superuser) {
                    navigate("/bookings");
                }
            } catch (err) {
                console.error("Error fetching user status:", err);
                // Redirect in case of error
                navigate("/login");
            }
        };

        checkAdminStatus();
    }, [navigate]);

    // Open Modal
    const openBookingModal = (booking = null) => {
        setCurrentBooking(booking);
        if (booking) {
            // When editing, initialize with the services from the booking
            setModalSelectedServices(booking.services.map(service => service.id));
        } else {
            // When adding, initialize with the currently selected services
            setModalSelectedServices(selectedServices);
        }
        setShowBookingModal(true);
    };

    // Close Modal
    const closeBookingModal = () => {
        setCurrentBooking(null);
        setShowBookingModal(false);
    };

    // Edit Booking
    const handleBookingUpdate = async (bookingId, updatedData) => {
        try {
            await axiosReq.put(`/admin/bookings/${bookingId}/`, updatedData);
            setAllEvents(
                allEvents.map(event =>
                    event.id === bookingId ? { ...event, ...updatedData } : event
                )
            );
            closeBookingModal();
        } catch (err) {
            if (err.response) {
                console.error("Error updating booking:", err.response.data);
            } else {
                console.error("Error updating booking:", err);
            }
        }
    };

    // Add Booking
    const handleAddBooking = async (newBooking) => {
        try {
            const response = await axiosReq.post(`/admin/bookings/`, newBooking);
            setAllEvents([...allEvents, {
                start: parseISO(response.data.date_time),
                end: parseISO(response.data.end_time),
                title: "Booking",
                booked: true,
                available: false,
                id: response.data.id
            }]);
            setBookingSuccess(true);
            closeBookingModal();
        } catch (err) {
            console.error("Error adding booking:", err);
            setBookingError("Could not add booking. Please try again.");
        }
    };

    // Delete Booking
    const handleDeleteBooking = async (bookingId) => {
        try {
            // Confirm before deleting
            const confirmDelete = window.confirm("Are you sure you want to delete this booking?");
            if (!confirmDelete) {
                return; // Exit if the user cancels
            }

            await axiosReq.delete(`/admin/bookings/${bookingId}/`);

            // Remove the deleted booking from the calendar events
            setAllEvents(allEvents.filter((event) => event.id !== bookingId));

            closeBookingModal();
        } catch (err) {
            console.error("Error deleting booking:", err);
            setBookingError("Could not delete booking. Please try again.");
        }
    };

    // Confirm availability creation
    const handleConfirmAvailability = () => {
        createAvailability(selectedTime.start, selectedTime.end);
        setShowConfirmModal(false);
    };

    // Cancel availability creation
    const handleCancelAvailability = () => {
        setSelectedTime(null);
        setShowConfirmModal(false);
    };

    // Create availability for a specific time slot
    const createAvailability = async (start, end) => {
        try {
            const response = await axiosReq.post(`/admin/availability/`, {
                date: start.toISOString().split('T')[0],  // Datum i YYYY-MM-DD format
                start_time: start.toTimeString().split(' ')[0],  // Tid i HH:MM:SS format
                end_time: end.toTimeString().split(' ')[0],  // Tid i HH:MM:SS format
            });

            // Update state to add new availabilitys
            setAllEvents([...allEvents, {
                start,
                end,
                available: true,
                booked: false,
                id: response.data.id
            }]);

            console.log("Availability created successfully:", response.data);
        } catch (err) {
            console.error("Error creating availability:", err);
            setBookingError("Could not create availability. Please try again.");
        }
    };


    useEffect(() => {
        const fetchTimes = async () => {
            try {
                const { data: availability } = await axiosReq.get("/admin/availability/");
                const { data: allBookings } = await axiosReq.get("/admin/bookings/");
                const { data: servicesData } = await axiosReq.get("/admin/services/");

                console.log("Fetched Bookings:", allBookings);

                setServices(servicesData);

                // Create events for all bookings and style them as blue events
                const bookedEvents = allBookings
                    .map((booking) => {
                        if (!booking.date_time || !booking.end_time) {
                            console.warn("Skipping invalid booking entry:", booking);
                            return null;
                        }

                        // Use the 'user_name' field from backend
                        const userName = booking.user_name || 'Unknown User';

                        return {
                            start: parseISO(booking.date_time),
                            end: parseISO(booking.end_time),
                            title: userName,  // Name, Surname
                            available: false,
                            booked: true,
                            id: booking.id,
                        };
                    })
                    .filter((event) => event !== null);

                // Generate available events split into 30-minute intervals
                const availableEvents = availability.flatMap((avail) => {
                    const [year, month, day] = avail.date.split("-").map(Number);
                    const [startHour, startMinute, startSecond] = avail.start_time.split(":").map(Number);
                    const [endHour, endMinute, endSecond] = avail.end_time.split(":").map(Number);

                    const start = new Date(year, month - 1, day, startHour, startMinute, startSecond);
                    const end = new Date(year, month - 1, day, endHour, endMinute, endSecond);

                    const events = [];
                    let current = start;

                    while (current < end) {
                        const next = new Date(current.getTime() + 30 * 60 * 1000); // 30 minutes forward

                        const eventStart = new Date(current);
                        const eventEnd = new Date(next);

                        // Check if there is overlapping booked times
                        const isOverlapping = bookedEvents.some((booked) => {
                            return (
                                (booked.start <= eventStart && eventStart < booked.end) ||
                                (booked.start < eventEnd && eventEnd <= booked.end) ||
                                (eventStart <= booked.start && eventEnd >= booked.end)
                            );
                        });

                        // Only add available times that do not overlap with bookings
                        if (!isOverlapping) {
                            events.push({
                                start: eventStart,
                                end: eventEnd,
                                available: true,
                                booked: false,
                            });
                        }

                        current = next;
                    }

                    return events;
                });

                setAllEvents([...availableEvents, ...bookedEvents]);
            } catch (err) {
                console.error("Error fetching times:", err);
            }
        };
        fetchTimes();

        const checkTimezone = () => {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const irelandTimezone = 'Europe/Dublin';
            const currentIrelandTime = new Date().toLocaleString("en-US", { timeZone: irelandTimezone });
            const irelandDate = new Date(currentIrelandTime);
            const currentUserDate = new Date();

            // Calculate the timezone difference and round it to the nearest whole number
            const timezoneDifference = Math.round((currentUserDate - irelandDate) / (1000 * 60 * 60));

            if (userTimezone !== irelandTimezone) {
                setTimezoneMessage(<>You are currently in the <strong>{userTimezone}</strong> timezone, which is <strong>{timezoneDifference > 0 ? "+" : ""}{timezoneDifference} hours </strong>{timezoneDifference > 0 ? "ahead" : "behind"} of Ireland's time.</>);
            } else {
                setTimezoneMessage("Please note that all bookings are made in Irish time (GMT+1).");
            }
        };
        checkTimezone();

        const fetchUsers = async () => {
            try {
                const usersRes = await axiosReq.get("/accounts/users/");
                setUsers(usersRes.data);
            } catch (err) {
                console.error("Error fetching users:", err);
            }
        };
        fetchUsers();
    }, []);


    const handleServiceChange = (serviceId) => {
        let updatedSelectedServices;
        if (selectedServices.includes(serviceId)) {
            updatedSelectedServices = selectedServices.filter((id) => id !== serviceId);
        } else {
            updatedSelectedServices = [...selectedServices, serviceId];
        }

        setSelectedServices(updatedSelectedServices);

        // Summarize working time for all chosen services
        const selectedServiceTimes = services
            .filter((service) => updatedSelectedServices.includes(service.id))
            .reduce((total, service) => total + parseWorktimeToMinutes(service.worktime), 0);

        setTotalWorktime(selectedServiceTimes);
    };

    const [isSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (bookingError) {
            setShowAlert(true); // Show the alert

            // Automatically close the alert after 5 seconds
            const timer = setTimeout(() => {
                setShowAlert(false);
            }, 5000);

            // Cleanup the timer when the component unmounts or when bookingError changes
            return () => clearTimeout(timer);
        }
    }, [bookingError]);

    useEffect(() => {
        const selectedServiceDetails = services.filter(service =>
            modalSelectedServices.includes(service.id)
        );

        // Calculate total duration
        const duration = calculateBookingDuration(selectedServiceDetails);
        setTotalDuration(duration);

        // Calculate total price
        const price = calculateTotalPrice(selectedServiceDetails);
        setTotalPrice(price);

        // Update totalWorktime (in minutes)
        const totalWorkMinutes = selectedServiceDetails.reduce((total, service) => {
            return total + parseWorktimeToMinutes(service.worktime);
        }, 0);
        setTotalWorktime(totalWorkMinutes);

    }, [modalSelectedServices, services]);

    const handleBookingSubmit = (event) => {
        event.preventDefault();
        const form = event.target;

        let bookingData = {};

        if (currentBooking) {
            // Editing an existing booking
            let dateTimeValue = form.date_time.value;
            if (dateTimeValue.length === 16) {
                dateTimeValue += ":00";
            }
            bookingData = {
                user_id: parseInt(form.user.value),
                service_ids: Array.from(form.services.options)
                    .filter((option) => option.selected)
                    .map((option) => parseInt(option.value)),
                date_time: dateTimeValue,
            };
        } else {
            // Adding a new booking
            bookingData = {
                user_id: parseInt(form.user.value),
                service_ids: modalSelectedServices,
                date_time: selectedTime.start.toISOString().slice(0, 19),
            };
        }
        if (currentBooking) {
            handleBookingUpdate(currentBooking.id, bookingData);
        } else {
            handleAddBooking(bookingData);
        }
    };

    // Show different colours for different events in the calendar
    const eventPropGetter = (event) => {
        let className = "";

        if (event.booked) {
            className = styles["user-booking"]; // Blue
        } else if (event.available) {
            className = styles["available-event"]; // Green
        } else {
            className = styles["unavailable-event"];
        }

        return { className };
    };

    return (
        <div className={styles["page-container"]}>
            <Container>
                <Row className="justify-content-center">
                    <Col className="d-flex justify-content-center">
                        <BookingInfoDropdown />
                    </Col>
                </Row>
                <Row className="justify-content-center">
                    <Col md={12}>
                        <h2 className={`${styles["choose-services-heading"]}`}>
                            Choose Services
                        </h2>

                        {bookingSuccess && (
                            <Alert
                                variant="success"
                                onClose={() => setShowAlert(false)}
                                dismissible
                                className={`position-fixed top-0 start-50 translate-middle-x ${styles["custom-success-alert"]}`}
                            >
                                <p>Booking Successful!</p>
                            </Alert>
                        )}

                        {showAlert && (
                            <Alert
                                variant="danger"
                                onClose={() => setShowAlert(false)}
                                dismissible
                                className={`position-fixed top-0 start-50 translate-middle-x ${styles["booking-fail-alert"]}`}
                            >
                                <p>{bookingError}</p>
                            </Alert>
                        )}

                        <Form
                            className={`${styles["services-to-choose"]} ${styles["booking-form"]}`}
                        >
                            {services.map((service) => {
                                return (
                                    <div
                                        key={service.id}
                                        className={styles["service-checkbox"]}
                                    >
                                        <Form.Check
                                            type="checkbox"
                                            label={`${service.name} (${convertWorktimeToReadableFormat(
                                                service.worktime
                                            )})`}
                                            checked={selectedServices.includes(service.id)}
                                            onChange={() => handleServiceChange(service.id)}
                                        />
                                    </div>
                                );
                            })}
                        </Form>

                        <h2 className={`${styles["choose-date-time-heading"]}`}>
                            Choose Date / Time
                        </h2>

                        <Row className="justify-content-center">
                            <Col
                                xs={12}
                                md={12}
                                className="px-0 d-flex justify-content-center"
                            >
                                {timezoneMessage && (
                                    <Alert
                                        variant="warning"
                                        className={`mt-3 ${styles["alert-custom"]}`}
                                    >
                                        {timezoneMessage}
                                    </Alert>
                                )}
                            </Col>
                        </Row>

                        <Row className="justify-content-center">
                            <Col xs={12} md={12} className="px-0">
                                <div className="w-100 calendar-container">
                                    <Calendar
                                        className={`${styles["custom-calendar"]}`}
                                        localizer={localizer}
                                        events={allEvents}
                                        step={30}
                                        timeslots={2}
                                        defaultView="week"
                                        views={["week", "day"]}
                                        components={{
                                            allDaySlot: false,
                                            header: CustomHeader,
                                        }}
                                        min={new Date(2024, 9, 6, 8, 0)}
                                        max={new Date(2024, 9, 6, 20, 30)}
                                        style={{ height: "auto", width: "100%" }}
                                        selectable={true}
                                        eventPropGetter={eventPropGetter}
                                        onSelectSlot={(slotInfo) => {
                                            const selectedStartTime = slotInfo.start;
                                            const selectedEndTime = slotInfo.end;

                                            // Check if opverlapping bookings
                                            const isOverlappingBooked = allEvents.some(event =>
                                                event.booked && (
                                                    (selectedStartTime >= event.start && selectedStartTime < event.end) ||
                                                    (selectedEndTime > event.start && selectedEndTime <= event.end) ||
                                                    (selectedStartTime <= event.start && selectedEndTime >= event.end)
                                                )
                                            );

                                            if (isOverlappingBooked) {
                                                return;  // Cancel if overlap
                                            }

                                            // Store selected time and show verification modal
                                            setSelectedTime({ start: selectedStartTime, end: selectedEndTime });
                                            setShowConfirmModal(true);
                                        }}
                                        onSelectEvent={async (event) => {
                                            if (event.booked) {
                                                if (!event.id) {
                                                    console.error("No booking ID found for this event.");
                                                    return;
                                                }

                                                try {
                                                    // Get Booking Details to open Modal for Edit of Booking
                                                    const response = await axiosReq.get(`/admin/bookings/${event.id}/`);
                                                    const bookingData = response.data;

                                                    // Open Modal to Edit Booking
                                                    openBookingModal({
                                                        ...event,
                                                        date_time: bookingData.date_time,
                                                        end_time: bookingData.end_time,
                                                        services: bookingData.services,
                                                        user: bookingData.user.id,
                                                    });
                                                } catch (error) {
                                                    console.error("Error fetching booking details:", error);
                                                }
                                            } else if (event.available && event.title === "Selected Time") {
                                                // If event is already selected, un-select it
                                                setAllEvents(allEvents.filter(ev => ev !== event));
                                                setSelectedTime(null);
                                            } else if (event.available && totalWorktime > 0) {
                                                // Select a new time as selected time
                                                const startTime = event.start;
                                                const endTime = new Date(startTime.getTime() + totalWorktime * 60000);
                                                const selectedRange = {
                                                    start: startTime,
                                                    end: endTime,
                                                    title: "Selected Time",
                                                    available: true,
                                                };

                                                setSelectedTime(selectedRange);

                                                const newEvents = [...allEvents.filter(ev => ev.title !== "Selected Time"), selectedRange];
                                                setAllEvents(newEvents);
                                            }
                                        }}

                                    />
                                </div>
                            </Col>
                        </Row>
                        {/* Modal for adding/editing bookings */}
                        <Modal show={showBookingModal} onHide={closeBookingModal}>
                            <Modal.Header closeButton>
                                <Modal.Title>
                                    {currentBooking ? "Edit Booking" : "Add Booking"}
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <Form onSubmit={handleBookingSubmit}>
                                    {/* Select User */}
                                    <Form.Group controlId="user">
                                        <Form.Label>User</Form.Label>
                                        <Form.Control
                                            as="select"
                                            name="user"
                                            defaultValue={currentBooking?.user || ""}
                                            required
                                        >
                                            <option value="">Select User</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.email}
                                                </option>
                                            ))}
                                        </Form.Control>
                                    </Form.Group>

                                    {/* Services */}
                                    <Form.Group controlId="services">
                                        <Form.Label>Services</Form.Label>
                                        {currentBooking ? (
                                            // Editable when editing a booking
                                            <Form.Control
                                                as="select"
                                                name="services"
                                                multiple
                                                value={modalSelectedServices}
                                                onChange={(e) => {
                                                    const selectedOptions = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
                                                    setModalSelectedServices(selectedOptions);
                                                }}
                                                required
                                            >
                                                {services.map((service) => (
                                                    <option key={service.id} value={service.id}>
                                                        {service.name}
                                                    </option>
                                                ))}
                                            </Form.Control>
                                        ) : (
                                            // Display selected services when adding a booking
                                            <div>
                                                {modalSelectedServices.map((serviceId) => {
                                                    const service = services.find((s) => s.id === serviceId);
                                                    return <p key={serviceId}>{service?.name}</p>;
                                                })}
                                            </div>
                                        )}
                                    </Form.Group>

                                    {/* Total Duration */}
                                    <Form.Group controlId="total_duration">
                                        <Form.Label>Total Duration</Form.Label>
                                        <p>{totalDuration || 'N/A'}</p>
                                    </Form.Group>

                                    {/* Total Price */}
                                    <Form.Group controlId="total_price">
                                        <Form.Label>Total Price</Form.Label>
                                        <p>{totalPrice ? `${totalPrice} Euro` : 'N/A'}</p>
                                    </Form.Group>

                                    {/* Date & Time */}
                                    <Form.Group controlId="date_time">
                                        <Form.Label>Date & Time</Form.Label>
                                        {currentBooking ? (
                                            // Editable when editing a booking
                                            <Form.Control
                                                type="datetime-local"
                                                name="date_time"
                                                defaultValue={new Date(currentBooking.date_time).toISOString().slice(0, 19)}
                                                required
                                            />
                                        ) : (
                                            // Display selected date & time when adding a booking
                                            <p>{selectedTime ? new Date(selectedTime.start).toLocaleString() : 'No time selected'}</p>
                                        )}
                                    </Form.Group>

                                    {/* Modal Footer */}
                                    <Modal.Footer>
                                        <Button variant="secondary" onClick={closeBookingModal}>
                                            Cancel
                                        </Button>
                                        {currentBooking && (
                                            <Button
                                                variant="danger"
                                                onClick={() => handleDeleteBooking(currentBooking.id)}
                                            >
                                                Delete Booking
                                            </Button>
                                        )}
                                        <Button type="submit" variant="primary">
                                            {currentBooking ? "Update Booking" : "Add Booking"}
                                        </Button>
                                    </Modal.Footer>
                                </Form>
                            </Modal.Body>
                        </Modal>

                        {/* Modal for adding availabilitys */}
                        <Modal show={showConfirmModal} onHide={handleCancelAvailability}>
                            <Modal.Header closeButton>
                                <Modal.Title>Confirm Availability</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>Do you want to add this area as available?</Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={handleCancelAvailability}>
                                    Cancel
                                </Button>
                                <Button variant="primary" onClick={handleConfirmAvailability}>
                                    Yes
                                </Button>
                            </Modal.Footer>
                        </Modal>


                    </Col>
                </Row>
            </Container>
            <div className={styles["sticky-button"]}>
                <Button
                    onClick={() => openBookingModal()}
                    disabled={isSubmitting || !selectedServices.length || !selectedTime}
                    className={`mt-3 ${styles["book-services-btn"]}`}
                >
                    {isSubmitting ? "Booking..." : "Book Services"}
                </Button>
            </div>

        </div>
    );
};

export default AdminBookings;