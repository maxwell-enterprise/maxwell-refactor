
export const SCROLL_TEST_DATA = Array.from({ length: 100 }, (_, i) => ({
    id: `TEST-SCROLL-${i}`,
    title: `Scroll Test Item ${i + 1}`,
    description: `This is dummy item number ${i + 1} to test the independent scrolling of the main content area vs the sidebar.`,
    timestamp: new Date().toISOString()
}));
