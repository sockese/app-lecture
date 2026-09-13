(function () {
  "use strict";

  var STORAGE_KEY = "lecture-auguste-data-v1";
  var NEW_BOOK_VALUE = "__new__";

  /* ---------- Persistence ---------- */

  function defaultData() {
    return {
      books: [],
      days: {},
      timer: {
        status: "idle", // idle | running | paused
        bookId: null,
        accumulatedSeconds: 0,
        startedAt: null, // epoch ms, only set while running
        startDate: null // ISO date the current session began on
      },
      viewedWeekStart: fridayOfWeek(new Date())
    };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      var parsed = JSON.parse(raw);
      var base = defaultData();
      return Object.assign(base, parsed, {
        timer: Object.assign(base.timer, parsed.timer || {})
      });
    } catch (e) {
      console.error("Lecture des données impossible, réinitialisation.", e);
      return defaultData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  var state = loadData();

  /* ---------- Date helpers ---------- */

  function toISODate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseISODate(iso) {
    var parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(date, n) {
    var copy = new Date(date);
    copy.setDate(copy.getDate() + n);
    return copy;
  }

  function fridayOfWeek(date) {
    var day = date.getDay(); // Sun=0 ... Sat=6
    var offsetFromFriday = (day - 5 + 7) % 7;
    var friday = addDays(date, -offsetFromFriday);
    friday.setHours(0, 0, 0, 0);
    return toISODate(friday);
  }

  var DAY_LABELS = ["vendredi", "samedi", "dimanche", "lundi", "mardi", "mercredi", "jeudi"];

  function weekDates(weekStartISO) {
    var start = parseISODate(weekStartISO);
    var out = [];
    for (var i = 0; i < 7; i++) {
      out.push(addDays(start, i));
    }
    return out;
  }

  function formatLongDate(date) {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  /* ---------- Formatting ---------- */

  function formatClock(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) {
      return h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    }
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  function formatDuration(totalSeconds) {
    if (totalSeconds <= 0) return "0 min";
    var totalMin = Math.round(totalSeconds / 60);
    if (totalMin <= 0) return "< 1 min";
    if (totalMin < 60) return totalMin + " min";
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return h + " h " + String(m).padStart(2, "0");
  }

  /* ---------- Books ---------- */

  function findBook(id) {
    return state.books.find(function (b) { return b.id === id; });
  }

  function makeId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function addBook(title) {
    var trimmed = title.trim();
    if (!trimmed) return null;
    var book = { id: makeId(), title: trimmed };
    state.books.push(book);
    saveData();
    return book;
  }

  /* ---------- DOM refs ---------- */

  var el = {
    prevWeek: document.getElementById("prev-week"),
    nextWeek: document.getElementById("next-week"),
    weekLabel: document.getElementById("week-label"),
    tableBody: document.getElementById("week-table-body"),
    weekTotal: document.getElementById("week-total"),
    currentBookLabel: document.getElementById("current-book-label"),
    timerDisplay: document.getElementById("timer-display"),
    startBtn: document.getElementById("start-btn"),
    pauseBtn: document.getElementById("pause-btn"),
    stopBtn: document.getElementById("stop-btn"),
    bookSelect: document.getElementById("book-select"),
    modal: document.getElementById("new-book-modal"),
    newBookTitle: document.getElementById("new-book-title"),
    cancelNewBook: document.getElementById("cancel-new-book"),
    confirmNewBook: document.getElementById("confirm-new-book")
  };

  /* ---------- Rendering ---------- */

  function renderWeek() {
    var dates = weekDates(state.viewedWeekStart);
    var todayISO = toISODate(new Date());

    el.weekLabel.textContent = "Semaine du " + formatLongDate(dates[0]) + " au " + formatLongDate(dates[6]);

    el.tableBody.innerHTML = "";
    var weekSeconds = 0;

    dates.forEach(function (date, i) {
      var iso = toISODate(date);
      var dayData = state.days[iso];
      var seconds = dayData ? dayData.seconds : 0;
      weekSeconds += seconds;

      var bookTitles = [];
      if (dayData && dayData.bookIds) {
        bookTitles = dayData.bookIds.map(function (id) {
          var b = findBook(id);
          return b ? b.title : null;
        }).filter(Boolean);
      }

      var tr = document.createElement("tr");
      if (iso === todayISO) tr.className = "today";

      var tdDay = document.createElement("td");
      tdDay.className = "day-name";
      tdDay.textContent = capitalize(DAY_LABELS[i]) + " " + date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      tr.appendChild(tdDay);

      var tdTime = document.createElement("td");
      tdTime.textContent = seconds > 0 ? formatDuration(seconds) : "-";
      tr.appendChild(tdTime);

      var tdBooks = document.createElement("td");
      tdBooks.className = "books-cell";
      tdBooks.textContent = bookTitles.length ? bookTitles.join(", ") : "-";
      tr.appendChild(tdBooks);

      el.tableBody.appendChild(tr);
    });

    el.weekTotal.textContent = formatDuration(weekSeconds);
  }

  function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  function renderBookSelect() {
    var current = state.timer.bookId;
    el.bookSelect.innerHTML = "";

    if (state.books.length === 0) {
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Aucun livre - ajoute un livre";
      placeholder.disabled = true;
      placeholder.selected = true;
      el.bookSelect.appendChild(placeholder);
    }

    state.books.forEach(function (book) {
      var opt = document.createElement("option");
      opt.value = book.id;
      opt.textContent = book.title;
      if (book.id === current) opt.selected = true;
      el.bookSelect.appendChild(opt);
    });

    var newOpt = document.createElement("option");
    newOpt.value = NEW_BOOK_VALUE;
    newOpt.textContent = "<Nouveau...>";
    el.bookSelect.appendChild(newOpt);

    el.bookSelect.disabled = state.timer.status === "running";

    var book = findBook(current);
    el.currentBookLabel.textContent = book ? "Livre en cours : " + book.title : "Aucun livre sélectionné";
  }

  function currentElapsedSeconds() {
    var t = state.timer;
    var extra = 0;
    if (t.status === "running" && t.startedAt) {
      extra = (Date.now() - t.startedAt) / 1000;
    }
    return t.accumulatedSeconds + extra;
  }

  function renderTimer() {
    el.timerDisplay.textContent = formatClock(currentElapsedSeconds());

    var status = state.timer.status;
    var hasBook = !!findBook(state.timer.bookId);

    el.startBtn.disabled = status === "running" || !hasBook;
    el.pauseBtn.disabled = status !== "running";
    el.stopBtn.disabled = status === "idle";
  }

  function renderAll() {
    renderWeek();
    renderBookSelect();
    renderTimer();
  }

  /* ---------- Timer actions ---------- */

  function startReading() {
    var t = state.timer;
    if (!findBook(t.bookId)) return;
    if (t.status === "running") return;

    if (t.status === "idle") {
      t.startDate = toISODate(new Date());
      t.accumulatedSeconds = 0;
    }
    t.startedAt = Date.now();
    t.status = "running";
    saveData();
    renderAll();
  }

  function pauseReading() {
    var t = state.timer;
    if (t.status !== "running") return;
    t.accumulatedSeconds += (Date.now() - t.startedAt) / 1000;
    t.startedAt = null;
    t.status = "paused";
    saveData();
    renderAll();
  }

  function stopReading() {
    var t = state.timer;
    if (t.status === "idle") return;

    var totalSeconds = t.accumulatedSeconds;
    if (t.status === "running" && t.startedAt) {
      totalSeconds += (Date.now() - t.startedAt) / 1000;
    }

    var dateISO = t.startDate || toISODate(new Date());
    var bookId = t.bookId;

    if (totalSeconds > 0 && bookId) {
      var day = state.days[dateISO];
      if (!day) {
        day = { seconds: 0, bookIds: [] };
        state.days[dateISO] = day;
      }
      day.seconds += Math.round(totalSeconds);
      if (day.bookIds.indexOf(bookId) === -1) {
        day.bookIds.push(bookId);
      }
    }

    t.status = "idle";
    t.accumulatedSeconds = 0;
    t.startedAt = null;
    t.startDate = null;

    state.viewedWeekStart = fridayOfWeek(new Date());

    saveData();
    renderAll();
  }

  /* ---------- Week navigation ---------- */

  function shiftWeek(deltaWeeks) {
    var start = parseISODate(state.viewedWeekStart);
    state.viewedWeekStart = toISODate(addDays(start, deltaWeeks * 7));
    saveData();
    renderWeek();
  }

  /* ---------- New book modal ---------- */

  function openNewBookModal() {
    el.newBookTitle.value = "";
    el.modal.hidden = false;
    el.newBookTitle.focus();
  }

  function closeNewBookModal() {
    el.modal.hidden = true;
    renderBookSelect(); // reset select back to actual current book if user cancelled
  }

  function confirmNewBook() {
    var title = el.newBookTitle.value;
    var book = addBook(title);
    if (!book) {
      el.newBookTitle.focus();
      return;
    }
    state.timer.bookId = book.id;
    saveData();
    el.modal.hidden = true;
    renderAll();
  }

  /* ---------- Event wiring ---------- */

  el.prevWeek.addEventListener("click", function () { shiftWeek(-1); });
  el.nextWeek.addEventListener("click", function () { shiftWeek(1); });

  el.startBtn.addEventListener("click", startReading);
  el.pauseBtn.addEventListener("click", pauseReading);
  el.stopBtn.addEventListener("click", stopReading);

  el.bookSelect.addEventListener("change", function () {
    var value = el.bookSelect.value;
    if (value === NEW_BOOK_VALUE) {
      openNewBookModal();
      return;
    }
    state.timer.bookId = value;
    saveData();
    renderTimer();
    renderBookSelect();
  });

  el.cancelNewBook.addEventListener("click", closeNewBookModal);
  el.confirmNewBook.addEventListener("click", confirmNewBook);
  el.newBookTitle.addEventListener("keydown", function (e) {
    if (e.key === "Enter") confirmNewBook();
    if (e.key === "Escape") closeNewBookModal();
  });

  /* ---------- Init ---------- */

  renderAll();

  setInterval(function () {
    if (state.timer.status === "running") {
      el.timerDisplay.textContent = formatClock(currentElapsedSeconds());
    }
  }, 1000);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function (err) {
        console.warn("Service worker non enregistré :", err);
      });
    });
  }
})();
