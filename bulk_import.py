import urllib.request
import urllib.parse
import json
import os
import time

PEXELS_KEY = 'BNz0gB5lTLncIkKcuXkLEVanU5lQE731mMZEBxPUKUhmmPDvtjxYhO6H'
SUPABASE_URL = 'https://zgcqbvvvwbgpbgaofkmg.supabase.co'
SUPABASE_KEY = 'sb_secret_f8T3RAMmcuuAJ2F99z68-w_2UiamJYy'

if not PEXELS_KEY or not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing environment variables")
    exit(1)

CATEGORY_SLUG = "cars-motorcycles"
QUERIES = ["classic cars", "muscle cars", "motorcycles", "sports cars", "vintage cars"]
TARGET = 100
imported = 0

for query in QUERIES:
    if imported >= TARGET:
        break
    page = 1
    while imported < TARGET:
        url = "https://api.pexels.com/v1/search?query=" + urllib.parse.quote(query) + "&per_page=20&page=" + str(page)
        req = urllib.request.Request(url, headers={"Authorization": PEXELS_KEY})
        try:
            with urllib.request.urlopen(req) as r:
                data = json.loads(r.read())
        except Exception as e:
            print("Pexels error: " + str(e))
            break
        photos = data.get("photos", [])
        if not photos:
            break
        for photo in photos:
            if imported >= TARGET:
                break
            image_url = photo["src"]["large"]
            description = photo.get("alt", query)
            photographer = photo.get("photographer", "Unknown")
            prompt = description + " (pexels photo by " + photographer + ")"
            try:
                with urllib.request.urlopen(image_url) as r:
                    image_data = r.read()
                    content_type = r.headers.get("Content-Type", "image/jpeg")
            except Exception as e:
                print("Download error: " + str(e))
                continue
            ext = "png" if "png" in content_type else "jpg"
            filename = "stock/" + str(int(time.time()*1000)) + "-pexels." + ext
            upload_url = SUPABASE_URL + "/storage/v1/object/jpix-generated/" + filename
            upload_req = urllib.request.Request(upload_url, data=image_data, headers={"Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": content_type}, method="POST")
            try:
                with urllib.request.urlopen(upload_req) as r:
                    pass
            except Exception as e:
                print("Upload error: " + str(e))
                continue
            public_url = SUPABASE_URL + "/storage/v1/object/public/jpix-generated/" + filename
            insert_url = SUPABASE_URL + "/rest/v1/generated_images"
            payload = json.dumps({"prompt": prompt, "image_url": public_url, "status": "pending_review", "category_slug": CATEGORY_SLUG}).encode()
            insert_req = urllib.request.Request(insert_url, data=payload, headers={"Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY, "Content-Type": "application/json", "Prefer": "return=minimal"}, method="POST")
            try:
                with urllib.request.urlopen(insert_req) as r:
                    imported += 1
                    print("[" + str(imported) + "/" + str(TARGET) + "] " + description[:60])
            except Exception as e:
                print("Insert error: " + str(e))
                continue
            time.sleep(0.2)
        page += 1

print("Done! Imported " + str(imported) + " images into pending review queue.")
