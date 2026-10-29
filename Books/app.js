const API = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org";

// Bestselling US authors and the most-read genres in the US (curated);
// photos, works and books come live from Open Library.
const AUTHORS = [
  "Stephen King", "Colleen Hoover", "James Patterson", "John Grisham", "Nora Roberts",
  "Danielle Steel", "Rebecca Yarros", "Emily Henry", "Suzanne Collins", "Dan Brown",
];
const GENRES = [
  { name: "Romance", subject: "romance" },
  { name: "Fantasy", subject: "fantasy" },
  { name: "Thriller", subject: "thrillers" },
];

const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

function cover(id, title) {
  return id
    ? `<img src="${COVERS}/b/id/${id}-M.jpg" alt="" loading="lazy">`
    : `<span class="placeholder">${esc(title)}</span>`;
}

async function loadBooks() {
  const el = $("books");
  try {
    const { works } = await getJSON(`${API}/trending/weekly.json?limit=5`);
    el.innerHTML = works.slice(0, 5).map((w, i) => `
      <li class="book">
        <a href="${API}${w.key}" target="_blank" rel="noopener">
          <div class="cover">${cover(w.cover_i, w.title)}</div>
          <span class="rank">${i + 1}</span>
          <h3>${esc(w.title)}</h3>
          <p>${esc((w.author_name || []).join(", "))}</p>
        </a>
      </li>`).join("");
  } catch {
    el.innerHTML = `<p class="error">Couldn't load trending books.</p>`;
  }
}

async function loadGenres() {
  const el = $("genres");
  el.innerHTML = GENRES.map((g, i) => `
    <article class="genre">
      <span class="rank">${i + 1}</span>
      <h3>${g.name}</h3>
      <p class="count" id="count-${g.subject}">&nbsp;</p>
      <div class="mini" id="genre-${g.subject}"></div>
    </article>`).join("");

  await Promise.all(GENRES.map(async (g) => {
    try {
      const data = await getJSON(`${API}/subjects/${g.subject}.json?limit=3`);
      $(`count-${g.subject}`).textContent = `${data.work_count.toLocaleString()} works`;
      $(`genre-${g.subject}`).innerHTML = data.works.map((w) => `
        <a href="${API}${w.key}" target="_blank" rel="noopener" title="${esc(w.title)}">
          ${cover(w.cover_id, w.title)}
        </a>`).join("");
    } catch {
      $(`count-${g.subject}`).textContent = "";
    }
  }));
}

async function loadAuthors() {
  const el = $("authors");
  el.innerHTML = AUTHORS.map((name, i) => `
    <li class="author" id="author-${i}">
      <span class="rank">${String(i + 1).padStart(2, "0")}</span>
      <div class="photo"><span>${esc(name.split(" ").map((p) => p[0]).join(""))}</span></div>
      <div>
        <h3>${esc(name)}</h3>
        <p class="meta">&nbsp;</p>
      </div>
    </li>`).join("");

  await Promise.all(AUTHORS.map(async (name, i) => {
    try {
      const { docs } = await getJSON(`${API}/search/authors.json?q=${encodeURIComponent(name)}&limit=1`);
      const a = docs[0];
      if (!a) return;
      const id = a.key.replace("/authors/", "");
      const li = $(`author-${i}`);
      const img = new Image();
      img.alt = "";
      img.onload = () => { if (img.naturalWidth > 1) li.querySelector(".photo").replaceChildren(img); };
      img.src = `${COVERS}/a/olid/${id}-M.jpg?default=false`;
      li.querySelector(".meta").textContent =
        [a.top_work, a.work_count && `${a.work_count} works`].filter(Boolean).join(" · ");
    } catch {}
  }));
}

loadBooks();
loadGenres();
loadAuthors();
