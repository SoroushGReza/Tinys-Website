import axios from "axios";

// Grundl�ggande inst�llningar f�r Axios
axios.defaults.baseURL = "https://nordic-company-b4376fa6e38c.herokuapp.com/api/";
axios.defaults.headers.post["Content-Type"] = "application/json";
axios.defaults.withCredentials = true;

// Funktion f�r att h�mta token fr�n localStorage
const getToken = () => {
    const token = localStorage.getItem("access");
    if (token) {
        return `Bearer ${token}`;
    }
    return null;
};

// S�tt access-token om den finns
const setAuthHeader = () => {
    const token = getToken();
    if (token) {
        axios.defaults.headers.common["Authorization"] = token;
    }
};

// Skapa Axios-instans f�r f�rfr�gningar
export const axiosReq = axios.create();
export const axiosRes = axios.create();

// S�tt token vid varje f�rfr�gan
axiosReq.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers["Authorization"] = token; // S�tt header f�r varje request
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Hantera svar, speciellt 401-fel f�r att f�rs�ka uppdatera token
axiosReq.interceptors.response.use(
    (response) => {
        return response; // Returnera svar om allt g�r bra
    },
    async (error) => {
        const originalRequest = error.config;

        // Om 401 Unauthorized och vi har inte redan f�rs�kt uppdatera token
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem("refresh");

                // Skicka f�rfr�gan om att uppdatera access-token
                const { data } = await axios.post("/accounts/token/refresh/", {
                    refresh: refreshToken,
                });

                localStorage.setItem("access", data.access); // Spara ny access-token
                axios.defaults.headers.common["Authorization"] = `Bearer ${data.access}`;

                // Upprepa den ursprungliga f�rfr�gan
                return axiosReq(originalRequest);
            } catch (refreshError) {
                console.error("Misslyckades med att uppdatera token", refreshError);
                // Logga ut anv�ndaren om refresh-token misslyckas
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                window.location.href = "/login"; // Skicka anv�ndaren till login
            }
        }

        return Promise.reject(error);
    }
);

setAuthHeader();
