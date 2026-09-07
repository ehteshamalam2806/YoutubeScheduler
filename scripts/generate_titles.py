import os
import sys
import json
import re
import gc
import time
import subprocess
import tempfile
import argparse

# Suppress HuggingFace symlink warnings on Windows
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import imageio_ffmpeg
from faster_whisper import WhisperModel

# Project directory paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS_DIR = os.path.join(BASE_DIR, 'videos')
DATA_JSON_FILE = os.path.join(BASE_DIR, 'data', 'videos.json')
DATA_JS_FILE = os.path.join(BASE_DIR, 'data', 'videos.js')

# Comprehensive vocabulary mapping for modern conversational Roman Hindi / Hinglish
HINDI_WORD_MAP = {
    # Pronouns & Prepositions
    'मैं': 'main', 'में': 'mein', 'मे': 'mein', 'मुझसे': 'mujhse', 'मुझपे': 'mujhpe',
    'मुझे': 'mujhe', 'मुझको': 'mujhko', 'मेरा': 'mera', 'मेरी': 'meri', 'मेरे': 'mere',
    'तू': 'tu', 'तुझसे': 'tujhse', 'तुझपे': 'tujhpe', 'तुझे': 'tujhe', 'तुझको': 'tujhko',
    'तेरा': 'tera', 'तेरी': 'teri', 'तेरे': 'tere',
    'तुम': 'tum', 'तुमसे': 'tumse', 'तुम्हें': 'tumhein', 'तुम्हे': 'tumhein', 'तुमको': 'tumko',
    'तुम्हारा': 'tumhara', 'तुम्हारी': 'tumhari', 'तुम्हारे': 'tumhare',
    'आप': 'aap', 'आपसे': 'aapse', 'आपको': 'aapko', 'आपका': 'aapka', 'आपकी': 'aapki', 'आपके': 'aapke',
    'हम': 'hum', 'हमसे': 'humse', 'हमें': 'humein', 'हमको': 'humko', 'हमारा': 'hamara', 'हमारी': 'hamari', 'हमारे': 'hamare',
    'वो': 'woh', 'वह': 'woh', 'उसे': 'use', 'उसको': 'usko', 'उससे': 'usse', 'उसने': 'usne',
    'उसका': 'uska', 'उसकी': 'uski', 'उसके': 'uske', 'उनका': 'unka', 'उनकी': 'unki', 'उनके': 'unke',
    'उन्हें': 'unhein', 'उनसे': 'unse',
    'ये': 'yeh', 'यह': 'yeh', 'इसे': 'ise', 'इसको': 'isko', 'इससे': 'isse', 'इसने': 'isne',
    'इसका': 'iska', 'इसकी': 'iski', 'इसके': 'iske',
    'कोई': 'koi', 'कुछ': 'kuch', 'किसी': 'kisi', 'किस': 'kis', 'किसे': 'kise', 'किसको': 'kisko',
    'क्या': 'kya', 'क्यों': 'kyun', 'क्यो': 'kyun', 'क्योंकि': 'kyunki', 'क्युकी': 'kyunki',
    'कब': 'kab', 'कभी': 'kabhi', 'कही': 'kahin', 'कहीं': 'kahin', 'कहा': 'kahan', 'कहाँ': 'kahan',
    'जब': 'jab', 'तब': 'tab', 'अब': 'ab', 'सब': 'sab', 'सबको': 'sabko', 'सबसे': 'sabse',
    'जो': 'jo', 'जिस': 'jis', 'जिसे': 'jise', 'जिसको': 'jisko', 'जिससे': 'jisse',
    'और': 'aur', 'या': 'ya', 'पर': 'par', 'पे': 'pe', 'से': 'se', 'को': 'ko', 'का': 'ka', 'की': 'ki', 'के': 'ke',
    'ने': 'ne', 'तक': 'tak', 'भी': 'bhi', 'ही': 'hi', 'तो': 'toh', 'ना': 'na', 'नहीं': 'nahi', 'नही': 'nahi',
    
    # Common Verbs & Auxiliaries
    'है': 'hai', 'हैं': 'hain', 'हो': 'ho', 'हूँ': 'hoon', 'हूं': 'hoon',
    'था': 'tha', 'थी': 'thi', 'थे': 'the',
    'होता': 'hota', 'होती': 'hoti', 'होते': 'hote', 'होने': 'hone', 'होगा': 'hoga', 'होगी': 'hogi', 'होंगे': 'honge',
    'गया': 'gaya', 'गई': 'gayi', 'गए': 'gaye', 'जाता': 'jaata', 'जाती': 'jaati', 'जाते': 'jaate',
    'जाना': 'jaana', 'जाओगे': 'jaoge', 'जाएगा': 'jaayega', 'जाएगी': 'jaayegi',
    'आया': 'aaya', 'आई': 'aayi', 'आए': 'aaye', 'आता': 'aata', 'आती': 'aati', 'आते': 'aate',
    'आना': 'aana', 'आओगे': 'aaoge', 'आएगा': 'aayega', 'आएगी': 'aayegi', 'आएंगे': 'aayenge',
    'रहा': 'raha', 'रही': 'rahi', 'रहे': 'rahe', 'रहना': 'rehna', 'रहता': 'rehta', 'रहती': 'rehti', 'रहते': 'rehte',
    'रहूंगा': 'rahunga', 'रहूंगी': 'rahungi', 'रहेंगे': 'rahenge',
    'करता': 'karta', 'करती': 'karti', 'करते': 'karte', 'करना': 'karna', 'किया': 'kiya', 'कीजिए': 'kijiye',
    'करूंगा': 'karunga', 'करूंगी': 'karungi', 'करेंगे': 'karenge',
    'देखा': 'dekha', 'देखी': 'dekhi', 'देखे': 'dekhe', 'देख': 'dekh', 'देखना': 'dekhna', 'देखकर': 'dekhkar',
    'सुना': 'suna', 'सुनी': 'suni', 'सुन': 'sun', 'सुनना': 'sunna', 'सुनकर': 'sunkar',
    'कहा': 'kaha', 'कही': 'kahi', 'कह': 'keh', 'कहना': 'kehna', 'कहते': 'kehte',
    'बोला': 'bola', 'बोली': 'boli', 'बोल': 'bol', 'बोलना': 'बोलना', 'बोलते': 'bolte',
    'पूछा': 'poocha', 'पूछी': 'poochi', 'पूछ': 'pooch', 'पूछे': 'pooche', 'पूछना': 'poochna',
    'भूला': 'bhoola', 'भूली': 'bhooli', 'भूल': 'bhool', 'भूलना': 'bhoolna', 'पाऊंगा': 'paunga', 'पाऊंगी': 'paungi',
    'पाना': 'paana', 'पाकर': 'paakar', 'खोना': 'khona', 'खोकर': 'khokar', 'खो': 'kho',
    'छोड़': 'chhod', 'छोड़ा': 'chhoda', 'छोड़ी': 'chhodi', 'छोड़े': 'chhode', 'छोड़ने': 'chhodne',
    'रोक': 'rok', 'रोका': 'roka', 'रोकना': 'rokna', 'सकते': 'sakte', 'सकता': 'sakta', 'सकती': 'sakti',
    'चाहता': 'chahta', 'चाहती': 'chahti', 'चाहते': 'chahte', 'चाहना': 'chaahna', 'चाहिए': 'chahiye',
    'मिलता': 'milta', 'मिलती': 'milti', 'मिलते': 'milte', 'मिलना': 'milna', 'मिला': 'mila', 'मिली': 'mili', 'मिले': 'mile',
    'समझा': 'samjha', 'समझी': 'samjhi', 'समझ': 'samajh', 'समझना': 'samajhna', 'समझाना': 'samjhana',
    
    # Emotional, Poetry & Core Nouns
    'प्यार': 'pyaar', 'इश्क': 'ishq', 'मोहब्बत': 'mohabbat', 'दिल': 'dil', 'धड़कन': 'dhadkan',
    'ज़िंदगी': 'zindagi', 'जिंदगी': 'zindagi', 'जीवन': 'jeevan', 'दुनिया': 'duniya', 'जहान': 'jahan',
    'बात': 'baat', 'बातों': 'baaton', 'वक्त': 'waqt', 'समय': 'samay', 'रात': 'raat', 'दिन': 'din',
    'साल': 'saal', 'महीने': 'maheene', 'पल': 'pal', 'लम्हा': 'lamha', 'लम्हे': 'lamhe',
    'याद': 'yaad', 'यादें': 'yaadein', 'आंसू': 'aansoo', 'दर्द': 'dard', 'सुकून': 'sukoon',
    'खुशी': 'khushi', 'गम': 'gham', 'मुस्कान': 'muskaan', 'मुस्कुराहट': 'muskurahat',
    'आंखें': 'aankhein', 'आँखें': 'aankhein', 'चेहरा': 'chehra', 'हाथ': 'haath',
    'इंसान': 'insaan', 'व्यक्ति': 'vyakti', 'शख्स': 'shakhs', 'लोग': 'log', 'अपनों': 'apno', 'अपने': 'apne',
    'अपमानित': 'apmaanit', 'सम्मान': 'sammaan', 'जलील': 'zaleel', 'नफ़रत': 'nafrat', 'नफरत': 'nafrat',
    'ज़हर': 'zehar', 'जहर': 'zehar', 'मौत': 'maut', 'सांस': 'saans',
    'बार-बार': 'baar-baar', 'बार': 'baar', 'पहली': 'pehli', 'पहला': 'pehla', 'पहले': 'pehle',
    'बाद': 'baad', 'मुलाकात': 'mulaqat', 'सफर': 'safar', 'रास्ता': 'raasta', 'मंजिल': 'manzil',
    'लेकिन': 'lekin', 'मगर': 'magar', 'शायद': 'shayad', 'सिर्फ': 'sirf', 'बहुत': 'bahut',
    'ज़्यादा': 'zyada', 'ज्यादा': 'zyada', 'कम': 'kam', 'हमेसा': 'hamesha', 'हमेशा': 'hamesha',
    'ज़रूरी': 'zaroori', 'जरूरी': 'zaroori', 'खास': 'khaas', 'सच': 'sach', 'झूठ': 'jhooth',
    'ठीक': 'theek', 'हद': 'hadd', 'लिमिट': 'limit', 'तलबगार': 'talabgaar', 'सौभाग्य': 'saubhagya',
    'जबर्दस्ती': 'zabardasti', 'जबरदस्ती': 'zabardasti'
}

def devanagari_to_roman_phonetic(word):
    """
    Phonetically converts unmapped Devanagari words into natural Roman Hindi.
    """
    vowels = {
        'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
        'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah'
    }
    matras = {
        'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
        'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
    }
    consonants = {
        'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'w', 'श': 'sh',
        'ष': 'sh', 'स': 's', 'ह': 'h',
        'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f'
    }
    
    chars = []
    i = 0
    n = len(word)
    while i < n:
        if i + 1 < n and word[i:i+2] in consonants:
            c = word[i:i+2]
            i += 2
        elif word[i] in consonants:
            c = word[i]
            i += 1
        elif word[i] in vowels:
            chars.append(vowels[word[i]])
            i += 1
            continue
        elif word[i] in matras:
            chars.append(matras[word[i]])
            i += 1
            continue
        elif word[i] == '्': # Halant
            i += 1
            continue
        else:
            chars.append(word[i])
            i += 1
            continue

        base = consonants[c]
        if i < n:
            if word[i] == '्': # Virama / half consonant
                chars.append(base)
                i += 1
            elif word[i] in matras:
                chars.append(base + matras[word[i]])
                i += 1
            elif word[i] in consonants or word[i] in vowels:
                chars.append(base + 'a')
            else:
                chars.append(base)
        else:
            # Word-final consonant (schwa deletion)
            chars.append(base)

    out = ''.join(chars)
    out = re.sub(r'aa+', 'aa', out)
    out = re.sub(r'eee+', 'ee', out)
    out = re.sub(r'ooo+', 'oo', out)
    out = re.sub(r'a([aeiou])', r'\1', out)
    return out

def convert_hindi_sentence_to_hinglish(text):
    """
    Converts Hindi Devanagari text into natural conversational Roman Hinglish.
    Preserves English words, applies rich normalization, and uses sentence casing.
    """
    if not text:
        return ''
    
    tokens = re.findall(r'[^\s.,!?;:\'\"()।]+|[.,!?;:\'\"()।]', text)
    result = []
    
    for tok in tokens:
        if tok in '.,!?;:\'"()।':
            if tok == '।':
                result.append('.')
            else:
                result.append(tok)
            continue
            
        # Check if already English / ASCII
        if all(ord(c) < 128 for c in tok):
            result.append(tok)
            continue
            
        clean_tok = tok.strip()
        if clean_tok in HINDI_WORD_MAP:
            result.append(HINDI_WORD_MAP[clean_tok])
        elif '-' in clean_tok:
            parts = clean_tok.split('-')
            norm_parts = [HINDI_WORD_MAP.get(p, devanagari_to_roman_phonetic(p)) for p in parts]
            result.append('-'.join(norm_parts))
        else:
            result.append(devanagari_to_roman_phonetic(clean_tok))
            
    sentence = ''
    for i, tok in enumerate(result):
        if i > 0 and tok not in '.,!?;:\'"' and not sentence.endswith(('\'', '"', '(', '[')):
            sentence += ' ' + tok
        else:
            sentence += tok
            
    return sentence

def clean_and_format_title(transcript_text, is_hindi=False):
    """
    Cleans transcribed text and formats a natural, concise YouTube Short title.
    Sentence casing (first letter capitalized only).
    """
    if not transcript_text:
        return ""

    # Remove whisper transcription artifacts and clean whitespace
    cleaned = re.sub(r'\s+', ' ', transcript_text).strip()
    
    # Split into sentences
    sentences = [s.strip() for s in re.split(r'[.!?।\n]+', cleaned) if s.strip()]
    if not sentences:
        return ""
    
    # Pick first meaningful sentence (skip if trivially short < 10 chars unless single sentence)
    first_sentence = sentences[0]
    if len(first_sentence) < 15 and len(sentences) > 1:
        candidate = f"{first_sentence}, {sentences[1]}"
    else:
        candidate = first_sentence

    if is_hindi:
        candidate = convert_hindi_sentence_to_hinglish(candidate)
    
    candidate = candidate.strip()
    if not candidate:
        return ""
        
    # Sentence case: Capitalize ONLY the first letter
    candidate = candidate[0].upper() + candidate[1:]

    # Clean length for YouTube Short title (~50-65 chars)
    needs_ellipsis = False
    if len(candidate) > 65:
        # Truncate at nearest word boundary
        candidate = candidate[:65].rsplit(' ', 1)[0]
        needs_ellipsis = True
        
    # Clean trailing punctuation
    candidate = candidate.rstrip(' ,;-')
    
    if needs_ellipsis and not candidate.endswith(('...', '!', '?')):
        candidate = candidate + "..."
        
    return candidate

def extract_audio_ffmpeg(video_path, output_audio_path):
    """
    Extracts audio from video to a lightweight 16kHz mono WAV using bundled ffmpeg.
    """
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        '-y',               # Overwrite output
        '-i', video_path,   # Input video
        '-vn',              # Disable video
        '-acodec', 'pcm_s16le',
        '-ar', '16000',     # 16kHz sample rate optimal for Whisper
        '-ac', '1',         # Mono channel
        output_audio_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {result.stderr.decode('utf-8', errors='ignore')}")

def load_videos_data():
    if not os.path.exists(DATA_JSON_FILE):
        return {"videos": []}
    with open(DATA_JSON_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def format_json_with_single_line_tags(data_obj):
    json_str = json.dumps(data_obj, indent=2, ensure_ascii=False)
    def replace_tags(match):
        tags_content = match.group(1)
        items = [s.strip() for s in tags_content.split('\n') if s.strip()]
        return f'"tags": [ {" ".join(items)} ]'
    
    json_str = re.sub(r'"tags":\s*\[\s*([\s\S]*?)\s*\]', replace_tags, json_str)
    return json_str

def save_videos_data(data_obj):
    json_content = format_json_with_single_line_tags(data_obj)
    
    with open(DATA_JSON_FILE, 'w', encoding='utf-8') as f:
        f.write(json_content + '\n')
        
    js_content = f"window.VIDEOS_DATA = {json_content};\n"
    with open(DATA_JS_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)

def safe_remove_file(filepath):
    """Safely removes a temporary file on Windows avoiding file locking issues."""
    for _ in range(5):
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
            break
        except (PermissionError, OSError):
            gc.collect()
            time.sleep(0.2)

def main():
    parser = argparse.ArgumentParser(description="Extract audio and generate YouTube Shorts titles locally in natural Hinglish/English using Whisper.")
    parser.add_argument('--file', type=str, help="Specific video fileName to process (e.g. Video_055.MP4)")
    parser.add_argument('--force', action='store_true', help="Force regenerate title even if one already exists")
    parser.add_argument('--model', type=str, default='small', help="Whisper model size: tiny, base, small, medium (default: small)")
    parser.add_argument('--dry-run', action='store_true', help="Preview generated titles without saving to file")
    
    args = parser.parse_args()

    data = load_videos_data()
    videos = data.get("videos", [])
    
    # Filter target videos
    target_videos = []
    for v in videos:
        file_name = v.get("fileName")
        title = v.get("title", "").strip()
        
        if args.file and file_name != args.file:
            continue
            
        if not args.file and not args.force and title != "":
            continue
            
        video_full_path = os.path.join(VIDEOS_DIR, file_name)
        if os.path.exists(video_full_path):
            target_videos.append((v, video_full_path))
        else:
            print(f"⚠️ Video file not found on disk: {file_name}")

    if not target_videos:
        print("✅ No videos found requiring title generation. (All videos have titles or files not found).")
        return

    print(f"🎙️ Found {len(target_videos)} video(s) to process.")
    print(f"⏳ Loading local Whisper model '{args.model}'...")
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    print("✅ Model loaded successfully.\n")

    updated_count = 0

    for v, video_path in target_videos:
        file_name = v.get("fileName")
        print(f"▶️ Processing: {file_name}...")
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_audio:
            tmp_audio_path = tmp_audio.name
            
        try:
            # 1. Extract audio
            extract_audio_ffmpeg(video_path, tmp_audio_path)
            
            # 2. Detect language automatically
            segments, info = model.transcribe(tmp_audio_path, beam_size=5)
            
            detected_lang = info.language
            # Strictly route Hindi & Urdu spoken speech to Hindi transcript -> Hinglish
            is_hindi = detected_lang in {'hi', 'ur'}
            
            if is_hindi and detected_lang != 'hi':
                # Force Hindi transcription to get clean Devanagari representation
                segments, _ = model.transcribe(tmp_audio_path, language='hi', beam_size=5)
                
            full_transcript = " ".join([seg.text.strip() for seg in segments]).strip()
            
            # 3. Generate clean Roman Hindi / English title
            final_title = clean_and_format_title(full_transcript, is_hindi=is_hindi)
            
            if not final_title:
                final_title = f"{os.path.splitext(file_name)[0]} - Ehte's Wanderlens"
                
            print(f"   [Detected Language]: {detected_lang} (prob: {info.language_probability:.2f})")
            print(f"   [Raw Transcript]: {full_transcript}")
            if is_hindi:
                roman_preview = convert_hindi_sentence_to_hinglish(full_transcript)
                print(f"   [Roman Hindi]: {roman_preview}")
            print(f"   [Final Title]: \"{final_title}\"\n")
            
            if not args.dry_run:
                v["title"] = final_title
                updated_count += 1
                
        except Exception as e:
            print(f"   ❌ Error processing {file_name}: {e}")
        finally:
            safe_remove_file(tmp_audio_path)

    if not args.dry_run and updated_count > 0:
        save_videos_data(data)
        print(f"🎉 Successfully updated {updated_count} video title(s) in data/videos.json and data/videos.js")
    elif args.dry_run:
        print("🔍 Dry run complete. No files were modified.")

if __name__ == "__main__":
    main()
