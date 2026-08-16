"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({ tutorProfileId }: { tutorProfileId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorProfileId, rating, comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not save review");
      return;
    }
    setOk(true);
    router.refresh();
  }

  if (ok) return <p className="success">Thanks — your review was saved.</p>;

  return (
    <form className="review-form" onSubmit={submit}>
      <h3>Leave a review</h3>
      <label>
        Rating
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </label>
      <label>
        Comment
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          minLength={10}
          rows={4}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-secondary" type="submit">
        Submit review
      </button>
    </form>
  );
}
