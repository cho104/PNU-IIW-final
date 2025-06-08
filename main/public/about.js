const PROJECT_INTRO_CONTAINER_SELECTOR = '#projectIntroContent .project-intro-container';
const TEAM_INTRO_CONTAINER_SELECTOR = '#teamIntroContent .team-intro-container';
let aboutDataCache = null;

async function fetchAboutDataOnce() {
    if (aboutDataCache) { return aboutDataCache; }
    try {
        const response = await fetch('/api/content/about');
        if (!response.ok) { throw new Error(`Failed to fetch About Us data: ${response.statusText} (${response.status})`); }
        aboutDataCache = await response.json();
        return aboutDataCache;
    } catch (error) { return null; }
}

function renderProjectIntro(data, containerElement) {
    if (!data || !containerElement) return;
    let html = '';
    if (data.projectTitle) { html += `<h2 class="about-section-title">${data.projectTitle}</h2>`; }
    if (data.projectIntro && Array.isArray(data.projectIntro)) {
        html += `<section class="about-subsection project-introduction-details">`;
        data.projectIntro.forEach(item => {
            if (item.type === 'paragraph' && item.content) { html += `<p>${item.content}</p>`; }
            else if (item.type === 'video' && item.videoId) {
                html += `<div class="video-responsive-container" ${item.title ? `aria-label="${item.title}"` : ''}>
                            <iframe
                                width="560" height="315"
                                src="https://www.youtube.com/embed/${item.videoId}?rel=0&modestbranding=1"
                                title="${item.title || 'YouTube video player'}"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowfullscreen>
                            </iframe>
                         </div>`;
            }
        });
        html += `</section>`;
    }
    if (data.mainFeatures && data.mainFeatures.title && data.mainFeatures.items) {
        html += `<section class="about-subsection main-features">`;
        html += `<h3>${data.mainFeatures.title}</h3>`;
        html += `<ul class="features-list">`;
        data.mainFeatures.items.forEach(item => {
            html += `<li><strong>${item.feature}:</strong> ${item.description}</li>`;
        });
        html += `</ul>`;
        html += `</section>`;
    }
    if (data.techStack && data.techStack.title && data.techStack.description) {
        html += `<section class="about-subsection tech-stack">`;
        html += `<h3>${data.techStack.title}</h3>`;
        html += `<p>${data.techStack.description}</p>`;
        html += `</section>`;
    }
    containerElement.innerHTML = html;
}

function renderTeamIntro(data, containerElement) {
    if (!data || !data.teamIntro || !containerElement) return;
    const teamData = data.teamIntro;
    let html = '';
    if (teamData.title) { html += `<h2 class="about-section-title">${teamData.title}</h2>`; }
    if (teamData.members && Array.isArray(teamData.members)) {
        html += `<div class="team-members-container">`;
        teamData.members.forEach(member => {
            html += `<div class="team-member-card">
                        <h4>${member.name}</h4>
                        <p class="member-role"><strong>Role:</strong> ${member.role}</p>
                        <p class="member-id"><strong>ID:</strong> ${member.studentID}</p>
                        <p class="member-dept"><strong>Department:</strong> ${member.department}</p>
                        ${member.contribution ? `<p class="member-contribution"><strong>Contribution:</strong> ${member.contribution}</p>` : ''}
                     </div>`;
        });
        html += `</div>`;
    }
    containerElement.innerHTML = html;
}

export async function initAboutPage() {
    const data = await fetchAboutDataOnce();
    const projectIntroContainer = document.querySelector(PROJECT_INTRO_CONTAINER_SELECTOR);
    const teamIntroContainer = document.querySelector(TEAM_INTRO_CONTAINER_SELECTOR);
    if (!projectIntroContainer || !teamIntroContainer) {
        console.error("About Us: One or more content containers not found.");
        const aboutContentDiv = document.getElementById('aboutContent');
        if (aboutContentDiv) { aboutContentDiv.innerHTML = `<p style="color:red; text-align:center;">About page structure error.</p>`; }
        return;
    }
    if (data) {
        renderProjectIntro(data, projectIntroContainer);
        renderTeamIntro(data, teamIntroContainer);
    } else {
        projectIntroContainer.innerHTML = `<p style="color:red; text-align:center;">Could not load project information.</p>`;
        teamIntroContainer.innerHTML = `<p style="color:red; text-align:center;">Could not load team information.</p>`;
    }
}