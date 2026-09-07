import sys
import re

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Comprehensive vocabulary mapping for modern conversational Roman Hindi
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
    'रहा': 'raha', 'रही': 'rahi', 'रहे': 'rahe', 'रहना': 'rehna', 'रहता': 'rehta', 'रहती': 'rehti', 'रहते': 'rehte',
    'करता': 'karta', 'करती': 'karti', 'करते': 'karte', 'करना': 'karna', 'किया': 'kiya', 'कीजिए': 'kijiye',
    'करूंगा': 'karunga', 'करूंगी': 'karungi',
    'देखा': 'dekha', 'देखी': 'dekhi', 'देखे': 'dekhe', 'देख': 'dekh', 'देखना': 'dekhna', 'देखकर': 'dekhkar',
    'सुना': 'suna', 'सुनी': 'suni', 'सुन': 'sun', 'सुनना': 'sunna', 'सुनकर': 'sunkar',
    'कहा': 'kaha', 'कही': 'kahi', 'कह': 'keh', 'कहना': 'kehna', 'कहते': 'kehte',
    'बोला': 'bola', 'बोली': 'boli', 'बोल': 'bol', 'बोलना': 'bolna', 'बोलते': 'bolte',
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
    'ठीक': 'theek', 'हद': 'hadd', 'लिमिट': 'limit', 'तलबगार': 'talabgaar', 'सौभाग्य': 'saubhagya'
}

def devanagari_to_roman_phonetic(word):
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
    if not text:
        return ''
    
    # Tokenize words while keeping full Unicode Devanagari words + matras intact
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
            
    # Sentence case: Capitalize ONLY the first letter
    sentence = sentence.strip()
    if sentence:
        sentence = sentence[0].upper() + sentence[1:]
        
    return sentence

if __name__ == '__main__':
    test_phrases = [
        "मैं कभी भी वो दिन नहीं भूल पाऊंगा",
        "कोई व्यक्ति बार बार अपमानित होने के बाद भी",
        "मुझसे पूछे",
        "तुझे",
        "बहुत प्यार करता हूं तुमसे",
        "तुम्हें छोड़ने के बाद",
        "पहली मुलाकात",
        "अगर कोई मुझसे पूछे",
        "ये प्यार जहर की तरह होता है"
    ]

    print("=== TEST RESULTS ===")
    for p in test_phrases:
        print(f"{p} -> {convert_hindi_sentence_to_hinglish(p)}")
