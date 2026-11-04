# wnilumol.com

Personal site for my fellow peers and prospective employers.

## Jules Dreams of Basketball

The [book reader](https://wnilumol.com/books/jules-dreams-of-basketball) is listed under Projects as “A Book Dedicated to Julien.” It displays pre-rendered page images in the page itself: a cover followed by two-page spreads on wider screens and single pages on narrow phones. Readers can flip pages, use Previous and Next, or enter full screen. The free PDF download sits below the reader. The PDF lives at `public/books/jules-dreams-of-basketball/jules-dreams-of-basketball.pdf`; the download link goes through `/books/jules-dreams-of-basketball/download` before redirecting to that file. The reader's compressed images do not change the downloadable PDF.

The private download count records eligible requests to that link, excluding likely bots and prefetches. It cannot confirm whether someone saved or opened the PDF, and direct requests to the PDF bypass the count. The count is never displayed on the site. To record downloads, provision a private Vercel Blob store named `book-downloads` and set `BOOK_DOWNLOADS_READ_WRITE_TOKEN` for the deployment. Downloads still work when the store or token is unavailable, but those requests are not counted. With that token in the local environment, run `npm run book:downloads` for the total and counts by UTC day.
