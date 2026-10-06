const API_URL = "https://script.google.com/macros/s/AKfycbzX6D5-8VYcLKpmIFQunKkYfniM-5INKB2j9iLVfYyeBgsglHJokfLMFb4_nFe-91rCzQ/exec";

const nameSearch = document.getElementById("nameSearch");
const searchBtn = document.getElementById("searchBtn");
const searchStatus = document.getElementById("searchStatus");
const results = document.getElementById("results");
const searchStep = document.getElementById("searchStep");
const formStep = document.getElementById("formStep");
const selectedGuest = document.getElementById("selectedGuest");
const rsvpForm = document.getElementById("rsvpForm");
const seatsField = document.getElementById("seatsField");
const confirmedSeats = document.getElementById("confirmedSeats");
const seatNote = document.getElementById("seatNote");
const formStatus = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
const confirmationStep = document.getElementById("confirmationStep");
const confirmationTitle = document.getElementById("confirmationTitle");
const confirmationText = document.getElementById("confirmationText");
const newRsvpBtn = document.getElementById("newRsvpBtn");

let selected = null;
let searchTimer = null;

function setStatus(el, text, type="") {
  el.textContent = text;
  el.className = "status" + (type ? " " + type : "");
}

function showSearchResults(guests) {
  results.innerHTML = "";
  if (!guests.length) {
    setStatus(searchStatus, "We couldn't find an invitation with that name. Please check the spelling or try another part of the name.");
    return;
  }

  setStatus(searchStatus, `${guests.length} invitation${guests.length === 1 ? "" : "s"} found. Select yours.`);
  guests.forEach(guest => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "guest-option";

    const name = document.createElement("span");
    name.className = "guest-name";
    name.textContent = guest.name;

    const meta = document.createElement("span");
    meta.className = "guest-meta";
    const group = guest.group ? `${guest.group} · ` : "";
    meta.textContent = `${group}${guest.reservedSeats} reserved seat${Number(guest.reservedSeats) === 1 ? "" : "s"}`;

    btn.appendChild(name);
    btn.appendChild(meta);
    btn.addEventListener("click", () => selectGuest(guest));
    results.appendChild(btn);
  });
}

async function searchGuests() {
  const q = nameSearch.value.trim();
  results.innerHTML = "";
  if (q.length < 2) {
    setStatus(searchStatus, "Please enter at least 2 characters.");
    return;
  }

  searchBtn.disabled = true;
  setStatus(searchStatus, "Searching…", "");
  searchStatus.classList.add("loading");

  try {
    const url = `${API_URL}?action=search&name=${encodeURIComponent(q)}`;
    const response = await fetch(url, { method: "GET", mode: "cors", redirect: "follow" });
    const data = await response.json();

    if (!data.success) throw new Error(data.message || "Unable to search invitations.");
    showSearchResults(data.guests || []);
  } catch (err) {
    console.error(err);
    setStatus(searchStatus, "We couldn't connect to the invitation list. Please refresh the page and try again.", "error");
  } finally {
    searchBtn.disabled = false;
    searchStatus.classList.remove("loading");
  }
}

function selectGuest(guest) {
  selected = guest;
  selectedGuest.innerHTML = `
    <div class="selected-top">
      <div>
        <div class="selected-name">${escapeHtml(guest.name)}</div>
        <span class="pill">${Number(guest.reservedSeats)} reserved seat${Number(guest.reservedSeats) === 1 ? "" : "s"}</span>
      </div>
      <button class="change-btn" type="button" id="changeGuest">Change name</button>
    </div>
  `;

  document.getElementById("changeGuest").addEventListener("click", resetToSearch);

  confirmedSeats.innerHTML = "";
  const max = Math.max(0, Number(guest.reservedSeats) || 0);
  for (let i = 1; i <= max; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i} seat${i === 1 ? "" : "s"}`;
    confirmedSeats.appendChild(option);
  }
  seatNote.textContent = `Your invitation has ${max} reserved seat${max === 1 ? "" : "s"}. You may confirm fewer, if needed.`;

  document.getElementById("attendingYes").checked = false;
  document.getElementById("attendingNo").checked = false;
  seatsField.classList.remove("hidden");
  formStatus.textContent = "";
  searchStep.classList.add("hidden");
  formStep.classList.remove("hidden");
  window.scrollTo({ top: document.getElementById("rsvp").offsetTop - 20, behavior: "smooth" });

  if (String(guest.rsvpStatus || "").toLowerCase() !== "pending") {
    rsvpForm.classList.add("hidden");
    selectedGuest.insertAdjacentHTML("afterend", `
      <div class="status error" style="margin:18px 0 0">
        Your RSVP is already recorded as <strong>${escapeHtml(guest.rsvpStatus)}</strong>.
        If you need to make a change, please contact the wedding hosts.
      </div>
    `);
  }
}

function resetToSearch() {
  selected = null;
  rsvpForm.classList.remove("hidden");
  formStep.classList.add("hidden");
  searchStep.classList.remove("hidden");
  results.innerHTML = "";
  setStatus(searchStatus, "");
  nameSearch.focus();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setAttendanceState() {
  const attendance = document.querySelector('input[name="attendance"]:checked')?.value;
  if (attendance === "no") {
    seatsField.classList.add("hidden");
  } else {
    seatsField.classList.remove("hidden");
  }
}

document.querySelectorAll('input[name="attendance"]').forEach(r => {
  r.addEventListener("change", setAttendanceState);
});

searchBtn.addEventListener("click", searchGuests);
nameSearch.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchGuests();
  }
});
nameSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = nameSearch.value.trim();
  if (q.length < 2) {
    results.innerHTML = "";
    setStatus(searchStatus, "");
    return;
  }
  searchTimer = setTimeout(searchGuests, 350);
});

rsvpForm.addEventListener("submit", async e => {
  e.preventDefault();

  if (!selected) return;
  const attendance = document.querySelector('input[name="attendance"]:checked')?.value;
  if (!attendance) {
    setStatus(formStatus, "Please select whether you will attend.", "error");
    return;
  }

  const seats = attendance === "yes" ? Number(confirmedSeats.value) : 0;
  if (attendance === "yes" && (!Number.isInteger(seats) || seats < 1 || seats > Number(selected.reservedSeats))) {
    setStatus(formStatus, "Please select a valid number of seats.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus(formStatus, "Submitting your RSVP…");
  formStatus.classList.add("loading");

  const params = new URLSearchParams({
    guestId: selected.id,
    attendance,
    confirmedSeats: String(seats),
    message: document.getElementById("message").value.trim().slice(0, 500),
    songRequest: document.getElementById("songRequest").value.trim().slice(0, 150)
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString()
    });
    const data = await response.json();

    if (!data.success) {
      if (data.duplicate) {
        throw new Error("Your RSVP has already been recorded. Please contact the wedding hosts for any changes.");
      }
      throw new Error(data.message || "The RSVP could not be saved.");
    }

    confirmationTitle.textContent = attendance === "yes" ? "We’ll see you there!" : "Thank you for letting us know.";
    confirmationText.textContent = attendance === "yes"
      ? `Thank you, ${data.name || selected.name}. Your RSVP for ${seats} seat${seats === 1 ? "" : "s"} has been recorded. We can't wait to celebrate with you on October 23, 2026!`
      : `Thank you, ${data.name || selected.name}. We’re sorry you won’t be able to join us, but we truly appreciate your response.`;

    formStep.classList.add("hidden");
    confirmationStep.classList.remove("hidden");
    window.scrollTo({ top: document.getElementById("rsvp").offsetTop - 20, behavior: "smooth" });

  } catch (err) {
    console.error(err);
    setStatus(formStatus, err.message || "The RSVP could not be saved. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    formStatus.classList.remove("loading");
  }
});

newRsvpBtn.addEventListener("click", () => {
  confirmationStep.classList.add("hidden");
  formStep.classList.add("hidden");
  searchStep.classList.remove("hidden");
  nameSearch.value = "";
  results.innerHTML = "";
  rsvpForm.reset();
  setStatus(searchStatus, "");
  window.scrollTo({ top: document.getElementById("rsvp").offsetTop - 20, behavior: "smooth" });
  nameSearch.focus();
});
