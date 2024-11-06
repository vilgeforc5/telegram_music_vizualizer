# tgbotaudio

simple telegram-bot + yandex api integration for stt + ai image text generation from song
\*PoC that it works

# to start

-   current implementation works ONLY with yandex service account.

    1. pnpm install
    2. create .env at root directory and obtain api keys (@see .env.example)
    3. obtain authorized_key.json for yandex service account
    4. pnpm run dev

# tbd

    Voice message support
    yandex v3 integration
    improve file info metrics handling for better stt result
