import os
import io
import time
import requests
from PIL import Image

DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dataset")

# Search terms are deliberately specific to reduce unrelated results.
PLAYERS = {
    "salman_khan": [
        '"Salman Khan" actor',
        '"Salman Khan" Bollywood',
    ],
    "shah_rukh_khan": [
        '"Shah Rukh Khan" actor',
        '"Shah Rukh Khan" Bollywood',
    ],
    "bobby_deol": [
        '"Bobby Deol" actor',
        '"Bobby Deol" Bollywood',
    ],
}

USER_AGENT = "BollywoodCelebrityCNN/1.0 (educational image dataset downloader; Python requests)"
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def _existing_images(folder):
    return [
        name for name in os.listdir(folder)
        if name.lower().endswith(IMAGE_EXTENSIONS)
        and os.path.isfile(os.path.join(folder, name))
    ]


def _commons_image_urls(query, limit=30):
    """Find public image files through Wikimedia Commons' official API."""
    endpoint = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": 6,
        "gsrlimit": min(limit, 50),
        "prop": "imageinfo",
        "iiprop": "url",
    }
    response = requests.get(
        endpoint,
        params=params,
        headers={"User-Agent": USER_AGENT},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    pages = payload.get("query", {}).get("pages", {})
    results = []
    for page in pages.values():
        imageinfo = page.get("imageinfo") or []
        if imageinfo and imageinfo[0].get("url"):
            results.append(imageinfo[0]["url"])
    return results


def _download_image(url, folder, filename):
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=20,
    )
    response.raise_for_status()
    if not response.content:
        return False

    image = Image.open(io.BytesIO(response.content))
    image.load()
    if image.width < 80 or image.height < 80:
        return False

    image = image.convert("RGB")
    image.save(os.path.join(folder, filename), "JPEG", quality=92)
    return True


def prepare_dataset(max_images_per_player=15):
    """
    Download images into dataset/<celebrity>/.
    Returns counts and per-celebrity errors instead of silently failing.
    """
    os.makedirs(DATASET_DIR, exist_ok=True)
    summary = {}
    errors = {}

    session_urls = {}
    for player, queries in PLAYERS.items():
        folder = os.path.join(DATASET_DIR, player)
        os.makedirs(folder, exist_ok=True)

        existing = _existing_images(folder)
        downloaded = len(existing)
        if downloaded >= max_images_per_player:
            summary[player] = downloaded
            continue

        seen_urls = set()
        urls = []
        query_errors = []
        for query in queries:
            try:
                for url in _commons_image_urls(query, limit=40):
                    if url not in seen_urls:
                        seen_urls.add(url)
                        urls.append(url)
            except Exception as exc:
                query_errors.append(f"{query}: {exc}")

        index = downloaded
        for url in urls:
            if downloaded >= max_images_per_player:
                break
            try:
                saved = _download_image(
                    url, folder, f"{player}_{index:03d}.jpg"
                )
                if saved:
                    downloaded += 1
                    index += 1
                    time.sleep(0.15)
            except Exception:
                # Individual source files may be unavailable or invalid.
                continue

        summary[player] = downloaded
        if downloaded < max_images_per_player:
            details = "; ".join(query_errors)
            if not urls and not details:
                details = "Wikimedia Commons returned no matching image files."
            errors[player] = (
                f"Only {downloaded}/{max_images_per_player} images available. "
                + details
            ).strip()

    return {"counts": summary, "errors": errors}
