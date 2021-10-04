var breadcrumbElement = document.querySelector("header nav");
if (breadcrumbElement) {
    window.addEventListener("keydown", event => {
        if (event.key === "Control")
            breadcrumbElement.classList.add("wt-ctrl");
    });
    window.addEventListener("keyup", event => {
        if (event.key === "Control")
            breadcrumbElement.classList.remove("wt-ctrl");
    });
}