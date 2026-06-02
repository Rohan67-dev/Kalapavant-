import urllib.request
import zipfile
import io
import os

url = "https://start.spring.io/starter.zip?type=maven-project&language=java&baseDir=backend&groupId=com.restaurant&artifactId=platform&name=platform&packageName=com.restaurant.platform&packaging=jar&javaVersion=17&dependencies=web,websocket,data-jpa,h2,lombok,validation"

print("Bootstrapping Spring Boot project...")
print("Fetching from URL:", url)

try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        zip_data = response.read()
    
    print("Download completed successfully! Extracting files...")
    with zipfile.ZipFile(io.BytesIO(zip_data)) as zip_ref:
        zip_ref.extractall(".")
    
    print("Project successfully bootstrapped in the 'backend' folder!")
except urllib.error.HTTPError as e:
    print("HTTP Error occurred:", e.code, e.reason)
    print("Response body:", e.read().decode())
except Exception as e:
    print("Error occurred while bootstrapping project:", e)
