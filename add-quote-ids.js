// Automatically add IDs to quote entries for anchor linking
document.addEventListener('DOMContentLoaded', () => {
    const quoteEntries = document.querySelectorAll('.quote-entry');
    quoteEntries.forEach((entry, index) => {
        if (!entry.id) {
            entry.id = `quote-${index}`;
        }
    });
});
