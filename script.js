// Interactive enhancements for smooth scrolling and console verification
document.addEventListener("DOMContentLoaded", () => {
    console.log("Portfolio loaded successfully. Welcome to Manuel Pérez's digital portfolio.");

    // Smooth scrolling enhancement for navigation links
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});