const API_BASE = "https://api.github.com";

// DOM Elements
const searchForm = document.getElementById("searchForm");
const battleForm = document.getElementById("battleForm");
const battleToggle = document.getElementById("battleToggle");

const usernameInput = document.getElementById("username");

const feedback = document.getElementById("feedback");
const results = document.getElementById("results");
const profileGrid = document.getElementById("profileGrid");
const repoGrid = document.getElementById("repoGrid");
const repoCount = document.getElementById("repoCount");
const battleSummary = document.getElementById("battleSummary");
const emptyState = document.getElementById("emptyState");


// Show Loading State
function setLoading(message) {

    feedback.className = "feedback loading";

    feedback.innerHTML = `
        <span class="spinner"></span>
        ${message}
    `;

    feedback.classList.remove("hidden");

    results.classList.add("hidden");
    emptyState.classList.add("hidden");

    setFormsDisabled(true);
}


// Enable / Disable Buttons
function setFormsDisabled(disabled) {

    document.querySelectorAll("form button").forEach(button => {
        button.disabled = disabled;
    });

}


// Show Error Message
function showError(message) {

    feedback.className = "feedback";

    feedback.textContent = message;

    feedback.classList.remove("hidden");

    results.classList.add("hidden");
    emptyState.classList.add("hidden");

    setFormsDisabled(false);

}


// Clear Feedback
function clearFeedback() {

    feedback.classList.add("hidden");
    feedback.textContent = "";

}


// Format Date
function formatDate(dateString) {

    if (!dateString) {
        return "Not available";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}


// Fetch Data from GitHub API
async function fetchJson(url) {

    const response = await fetch(url, {
        headers: {
            "Accept": "application/vnd.github+json"
        }
    });

    // fetch() does not automatically reject HTTP 404.
    if (!response.ok) {

        if (response.status === 404) {
            throw new Error(
                "User Not Found — Please check the GitHub username."
            );
        }

        if (response.status === 403) {
            throw new Error(
                "GitHub API rate limit reached. Please try again later."
            );
        }

        throw new Error(
            `API request failed. Status: ${response.status}`
        );

    }

    return response.json();

}


// Get User Profile and Repositories
async function getUserAndRepos(username) {

    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername) {
        throw new Error("Please enter a GitHub username.");
    }

    // First API request: Get user profile
    const user = await fetchJson(
        `${API_BASE}/users/${encodeURIComponent(cleanUsername)}`
    );

    // Second API request: Get repositories
    const repos = await fetchJson(
        user.repos_url + "?per_page=100"
    );

    // Sort repositories by latest updated date
    repos.sort((a, b) => {
        return new Date(b.updated_at) - new Date(a.updated_at);
    });

    return {
        user,
        repos,
        latestRepos: repos.slice(0, 5)
    };

}


// Create HTML Element Safely
function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;

}


// Create Profile Card
function makeProfileCard(user, totalStars = null) {

    const card = createElement("article", "profile-card");

    const top = createElement("div", "profile-top");

    const avatar = createElement("img", "avatar");

    avatar.src = user.avatar_url;
    avatar.alt = `${user.login}'s GitHub avatar`;

    const identity = createElement("div");

    const name = createElement(
        "h3",
        "profile-name",
        user.name || user.login
    );

    const login = createElement(
        "a",
        "profile-login",
        `@${user.login}`
    );

    login.href = user.html_url;
    login.target = "_blank";
    login.rel = "noopener noreferrer";

    identity.append(name, login);

    top.append(avatar, identity);


    const bio = createElement(
        "p",
        "profile-bio",
        user.bio || "No bio available."
    );


    const meta = createElement("div", "profile-meta");


    // Joined Date
    const joined = createElement("div");

    joined.append(
        createElement("span", "meta-label", "JOINED GITHUB"),
        createElement(
            "span",
            "meta-value",
            formatDate(user.created_at)
        )
    );


    // Portfolio URL
    const portfolio = createElement("div");

    portfolio.append(
        createElement("span", "meta-label", "PORTFOLIO")
    );

    const portfolioValue = createElement("span", "meta-value");

    if (user.blog) {

        const link = document.createElement("a");

        link.href = /^https?:\/\//i.test(user.blog)
            ? user.blog
            : `https://${user.blog}`;

        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = user.blog;

        portfolioValue.append(link);

    } else {

        portfolioValue.textContent = "Not provided";

    }

    portfolio.append(portfolioValue);

    meta.append(joined, portfolio);

    card.append(top, bio, meta);


    // Battle Mode Stars
    if (totalStars !== null) {

        const stars = createElement(
            "div",
            "stars-total",
            `★ ${totalStars.toLocaleString()} total repository stars`
        );

        card.append(stars);

    }

    return card;

}


// Create Repository Card
function makeRepoCard(repo) {

    const card = createElement("article", "repo-card");

    const title = createElement(
        "a",
        "repo-name",
        repo.name
    );

    title.href = repo.html_url;
    title.target = "_blank";
    title.rel = "noopener noreferrer";


    const description = createElement(
        "p",
        "repo-description",
        repo.description || "No description available."
    );


    const stats = createElement("div", "repo-stats");

    const language = createElement(
        "span",
        "",
        repo.language || "No language"
    );

    const stars = createElement(
        "span",
        "",
        `★ ${repo.stargazers_count}`
    );

    const updated = createElement(
        "span",
        "",
        `Updated ${formatDate(repo.updated_at)}`
    );

    stats.append(language, stars, updated);

    card.append(title, description, stats);

    return card;

}


// Render Single User Profile
function renderSingle(data) {

    profileGrid.replaceChildren(
        makeProfileCard(data.user)
    );

    repoGrid.replaceChildren();

    data.latestRepos.forEach(repo => {
        repoGrid.append(makeRepoCard(repo));
    });

    repoCount.textContent =
        `${data.latestRepos.length} REPOSITORIES`;

    battleSummary.classList.add("hidden");

    results.classList.remove("hidden");
    emptyState.classList.add("hidden");

    clearFeedback();

    setFormsDisabled(false);

}


// Handle Normal Search
async function handleSingleSearch(event) {

    event.preventDefault();

    try {

        setLoading("Searching profile and loading repositories...");

        const data = await getUserAndRepos(
            usernameInput.value
        );

        renderSingle(data);

    } catch (error) {

        showError(error.message);

    }

}


// Handle Battle Mode
async function handleBattleSearch(event) {

    event.preventDefault();

    const firstName =
        document.getElementById("usernameOne").value.trim();

    const secondName =
        document.getElementById("usernameTwo").value.trim();


    if (
        firstName.toLowerCase() === secondName.toLowerCase()
    ) {

        showError("Please enter two different usernames.");

        return;

    }


    try {

        setLoading("Comparing developers...");


        // Fetch both user profiles simultaneously
        const [firstUser, secondUser] = await Promise.all([

            fetchJson(
                `${API_BASE}/users/${encodeURIComponent(firstName.replace(/^@/, ""))}`
            ),

            fetchJson(
                `${API_BASE}/users/${encodeURIComponent(secondName.replace(/^@/, ""))}`
            )

        ]);


        // Fetch both repository lists simultaneously
        const [firstRepos, secondRepos] = await Promise.all([

            fetchJson(firstUser.repos_url + "?per_page=100"),

            fetchJson(secondUser.repos_url + "?per_page=100")

        ]);


        // Calculate total stars using reduce()
        const firstStars = firstRepos.reduce(
            (sum, repo) => sum + repo.stargazers_count,
            0
        );

        const secondStars = secondRepos.reduce(
            (sum, repo) => sum + repo.stargazers_count,
            0
        );


        profileGrid.replaceChildren(

            makeProfileCard(firstUser, firstStars),

            makeProfileCard(secondUser, secondStars)

        );


        const cards =
            profileGrid.querySelectorAll(".profile-card");


        // Compare developers
        if (firstStars > secondStars) {

            cards[0].classList.add("winner");
            cards[1].classList.add("loser");

            battleSummary.textContent =
                `${firstUser.login} wins with ${firstStars} stars!`;

        } else if (secondStars > firstStars) {

            cards[1].classList.add("winner");
            cards[0].classList.add("loser");

            battleSummary.textContent =
                `${secondUser.login} wins with ${secondStars} stars!`;

        } else {

            battleSummary.textContent =
                `It's a tie! Both developers have ${firstStars} stars.`;

        }


        battleSummary.classList.remove("hidden");

        repoGrid.replaceChildren();

        repoCount.textContent = "BATTLE MODE";

        results.classList.remove("hidden");
        emptyState.classList.add("hidden");

        clearFeedback();

        setFormsDisabled(false);

    } catch (error) {

        showError(error.message);

    }

}


// Toggle Between Search Modes
battleToggle.addEventListener("change", () => {

    const battleOn = battleToggle.checked;

    searchForm.classList.toggle("hidden", battleOn);

    battleForm.classList.toggle("hidden", !battleOn);

    clearFeedback();

    results.classList.add("hidden");

    emptyState.classList.remove("hidden");

});


// Event Listeners
searchForm.addEventListener(
    "submit",
    handleSingleSearch
);

battleForm.addEventListener(
    "submit",
    handleBattleSearch
);


// Example Username Buttons
document.querySelectorAll("[data-example]").forEach(button => {

    button.addEventListener("click", () => {

        if (battleToggle.checked) {

            document.getElementById("usernameOne").value =
                button.dataset.example;

        } else {

            usernameInput.value = button.dataset.example;

            searchForm.requestSubmit();

        }

    });

});