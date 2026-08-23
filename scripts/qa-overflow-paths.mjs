/**
 * Viewport overflow probe via sequential fetches won't run DOM.
 * Used after deploy with browser; locally documents target paths.
 */
const paths = [
  "/",
  "/search",
  "/pricing",
  "/past-papers",
  "/past-papers/cambridge/igcse/physics-0625",
  "/past-papers/cambridge/o-level/business-7115",
  "/past-papers/cambridge/igcse/chemistry-0620",
  "/past-papers/cambridge/o-level/computer-science-2210",
  "/how-it-works",
  "/become-a-tutor",
  "/help",
  "/contact",
  "/login",
  "/register",
  "/terms",
  "/privacy",
  "/tutors/cmszs2z0n0006rfenbufw47yh",
];
console.log(JSON.stringify({ paths, note: "use browser CDP for scrollWidth checks" }, null, 2));
