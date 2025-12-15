import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Group() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      // Redirect old /group/:id route to new /chats/:id route
      navigate(`/chats/${id}`, { replace: true });
    } else {
      // If no ID, redirect to chats list
      navigate("/chats", { replace: true });
    }
  }, [id, navigate]);

  return null; // This component just handles the redirect
}
