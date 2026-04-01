package run.halo.bible.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStreamReader;
import java.io.InputStream;
import java.io.Reader;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import run.halo.bible.dto.BibleDiagnosticsDto;
import run.halo.bible.dto.BibleEditsDto;
import run.halo.bible.dto.BibleSetting;
import run.halo.bible.dto.BibleThemePayload;
import run.halo.bible.dto.BibleUserNotesDto;
import run.halo.bible.dto.BibleVerseNoteDto;
import run.halo.bible.dto.BibleVerseDto;
import run.halo.bible.dto.BookChapterItem;
import run.halo.bible.dto.VerseQueryResult;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvBibleService {

    private static final String CSV_PATH = "bible/bible.csv";
    private static final String[] BUILTIN_CSV_CANDIDATES = {
        "bible/bible.csv",
        "/bible/bible.csv",
        "BOOT-INF/classes/bible/bible.csv",
        "/BOOT-INF/classes/bible/bible.csv"
    };
    private static final String[] HEADERS = {"约名", "大类", "卷名", "卷数", "章数", "节数", "内容"};
    private static final String CONFIG_FILE = "config.json";
    private static final String BUILTIN_CSV_PATH = "/plugins/bible/assets/bible.csv";
    private static final String DEFAULT_ICON_URL = "/plugins/bible/assets/login.png";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile List<BibleVerseDto> verses = new ArrayList<>();
    private volatile BibleEditsDto edits = new BibleEditsDto();
    private volatile BibleSetting cachedSetting = new BibleSetting();
    private volatile String sourceMode = "内置数据";
    private volatile String sourceDetail = "内置 bible.csv";
    private volatile String lastReloadAt = "";
    private volatile String lastError = "";

    private Path editsPath;
    private Path configPath;
    private Path notesDir;

    @jakarta.annotation.PostConstruct
    public void loadCsv() {
        reloadCsvFromConfig();
    }

    public synchronized void reloadCsvFromConfig() {
        try {
            resolveEditsPath();
            resolveConfigPath();
            resolveNotesDir();
            cachedSetting = readSettingsConfig();
            List<BibleVerseDto> loaded = loadVersesFromConfig(cachedSetting);
            verses = new ArrayList<>(loaded);
            loadEdits();
            applyEdits();
            lastReloadAt = Instant.now().toString();
            lastError = "";
            log.info("Bible data reloaded, verse count: {}", verses.size());
        } catch (Exception e) {
            lastError = e.getMessage();
            log.error("Failed to load bible data", e);
        }
    }

    private List<BibleVerseDto> loadVersesFromConfig(BibleSetting setting) throws Exception {
        if (setting.getCsvUrl() != null && !setting.getCsvUrl().isBlank()) {
            try {
                String csvText = fetchCsvFromUrl(setting.getCsvUrl().trim());
                sourceMode = "远程 CSV";
                sourceDetail = setting.getCsvUrl().trim();
                return parseCsvFromReader(new StringReader(csvText));
            } catch (Exception e) {
                log.warn("Failed to load CSV from url {}, falling back: {}", setting.getCsvUrl(), e.getMessage());
            }
        }
        if (setting.getCsvText() != null && !setting.getCsvText().isBlank()) {
            sourceMode = "内嵌文本";
            sourceDetail = "内嵌 CSV 文本";
            return parseCsvFromReader(new StringReader(setting.getCsvText()));
        }
        Reader builtinReader = openBuiltinCsvReader();
        if (builtinReader == null) {
            throw new IllegalStateException("内置 CSV 不存在: " + CSV_PATH);
        }
        sourceMode = "内置数据";
        sourceDetail = "内置 bible.csv";
        try (Reader reader = builtinReader) {
            return parseCsvFromReader(reader);
        }
    }

    private Reader openBuiltinCsvReader() {
        for (String candidate : BUILTIN_CSV_CANDIDATES) {
            try {
                ClassPathResource resource = new ClassPathResource(candidate);
                if (resource.exists()) {
                    return new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8);
                }
            } catch (Exception ignored) {
            }

            try {
                String normalized = candidate.startsWith("/") ? candidate.substring(1) : candidate;
                InputStream stream = CsvBibleService.class.getClassLoader().getResourceAsStream(normalized);
                if (stream != null) {
                    return new InputStreamReader(stream, StandardCharsets.UTF_8);
                }
            } catch (Exception ignored) {
            }

            try {
                InputStream stream = CsvBibleService.class.getResourceAsStream(candidate.startsWith("/") ? candidate : "/" + candidate);
                if (stream != null) {
                    return new InputStreamReader(stream, StandardCharsets.UTF_8);
                }
            } catch (Exception ignored) {
            }
        }

        Path devPath = Paths.get("src", "main", "resources", "bible", "bible.csv");
        if (Files.isRegularFile(devPath)) {
            try {
                return Files.newBufferedReader(devPath, StandardCharsets.UTF_8);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String fetchCsvFromUrl(String url) throws Exception {
        HttpClient client = HttpClient.newBuilder().build();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .timeout(java.time.Duration.ofSeconds(30))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() != 200) {
            throw new IllegalStateException("HTTP " + response.statusCode() + ": " + url);
        }
        return response.body();
    }

    private List<BibleVerseDto> parseCsvFromReader(Reader reader) throws Exception {
        List<BibleVerseDto> list = new ArrayList<>();
        try (CSVParser parser = new CSVParser(reader, CSVFormat.DEFAULT.builder()
            .setHeader(HEADERS)
            .setSkipHeaderRecord(true)
            .build())) {
            int id = 0;
            for (CSVRecord record : parser) {
                BibleVerseDto dto = new BibleVerseDto();
                dto.setId("csv-" + (id++));
                dto.setCovenantName(get(record, "约名"));
                dto.setCategory(get(record, "大类"));
                dto.setBookName(get(record, "卷名"));
                dto.setBookNumber(parseInt(record, "卷数"));
                dto.setChapterNumber(parseInt(record, "章数"));
                dto.setVerseNumber(parseInt(record, "节数"));
                dto.setContent(get(record, "内容"));
                if (dto.getBookName() == null || dto.getBookName().isBlank()) {
                    continue;
                }
                list.add(dto);
            }
        }
        return list;
    }

    private void resolveEditsPath() {
        String env = System.getenv("BIBLE_EDITS_PATH");
        if (env != null && !env.isBlank()) {
            editsPath = Paths.get(env.trim());
        } else {
            editsPath = Paths.get(System.getProperty("user.home", "."), ".halo", "plugins", "bible", "edits.json");
        }
    }

    private void resolveConfigPath() {
        Path base = editsPath != null
            ? editsPath.getParent()
            : Paths.get(System.getProperty("user.home", "."), ".halo", "plugins", "bible");
        configPath = base != null ? base.resolve(CONFIG_FILE) : Paths.get(CONFIG_FILE);
    }

    private void resolveNotesDir() {
        Path base = editsPath != null
            ? editsPath.getParent()
            : Paths.get(System.getProperty("user.home", "."), ".halo", "plugins", "bible");
        notesDir = base != null ? base.resolve("notes") : Paths.get("notes");
    }

    private BibleSetting readSettingsConfig() {
        BibleSetting defaults = new BibleSetting();
        if (configPath == null || !Files.isRegularFile(configPath)) {
            return defaults;
        }
        try {
            String json = Files.readString(configPath, StandardCharsets.UTF_8);
            BibleSetting loaded = objectMapper.readValue(json, BibleSetting.class);
            return normalizeSetting(loaded);
        } catch (Exception e) {
            log.debug("Failed to read config.json: {}", e.getMessage());
            return defaults;
        }
    }

    private BibleSetting normalizeSetting(BibleSetting setting) {
        BibleSetting normalized = setting == null ? new BibleSetting() : setting;
        if (normalized.getCsvUrl() == null) normalized.setCsvUrl("");
        if (normalized.getCsvText() == null) normalized.setCsvText("");
        if (normalized.getFloatPosition() == null || normalized.getFloatPosition().isBlank()) {
            normalized.setFloatPosition("right-bottom");
        }
        if (normalized.getVisiblePages() == null || normalized.getVisiblePages().isEmpty()) {
            normalized.setVisiblePages(new ArrayList<>(List.of("home", "post")));
        }
        if (normalized.getFloatIconUrl() == null) normalized.setFloatIconUrl("");
        if (normalized.getIncludePaths() == null) normalized.setIncludePaths("");
        if (normalized.getExcludePaths() == null) normalized.setExcludePaths("");
        return normalized;
    }

    public synchronized BibleSetting getSettings() {
        resolveConfigPath();
        cachedSetting = normalizeSetting(readSettingsConfig());
        return cachedSetting;
    }

    public synchronized void saveSettingsAndReload(BibleSetting setting) {
        resolveConfigPath();
        BibleSetting normalized = normalizeSetting(setting);
        try {
            Path parent = configPath != null ? configPath.getParent() : null;
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(normalized);
            Files.writeString(configPath, json, StandardCharsets.UTF_8);
            cachedSetting = normalized;
        } catch (Exception e) {
            log.error("Failed to save config.json: {}", configPath, e);
            throw new RuntimeException("保存设置失败: " + e.getMessage(), e);
        }
        reloadCsvFromConfig();
    }

    private synchronized void loadEdits() {
        edits = new BibleEditsDto();
        if (editsPath == null || !Files.isRegularFile(editsPath)) {
            return;
        }
        try {
            String json = Files.readString(editsPath, StandardCharsets.UTF_8);
            edits = objectMapper.readValue(json, BibleEditsDto.class);
            if (edits.getDeletedIds() == null) edits.setDeletedIds(new ArrayList<>());
            if (edits.getUpdated() == null) edits.setUpdated(new ArrayList<>());
            if (edits.getCreated() == null) edits.setCreated(new ArrayList<>());
        } catch (Exception e) {
            log.warn("Failed to load edits file: {}", editsPath, e);
        }
    }

    private synchronized void applyEdits() {
        for (String id : edits.getDeletedIds()) {
            verses.removeIf(v -> id.equals(v.getId()));
        }
        for (BibleVerseDto dto : edits.getUpdated()) {
            if (dto == null || dto.getId() == null) continue;
            for (int i = 0; i < verses.size(); i++) {
                if (dto.getId().equals(verses.get(i).getId())) {
                    verses.set(i, dto);
                    break;
                }
            }
        }
        for (BibleVerseDto dto : edits.getCreated()) {
            if (dto != null && dto.getId() != null) {
                verses.add(dto);
            }
        }
    }

    private synchronized void saveEdits() {
        if (editsPath == null) return;
        try {
            Path parent = editsPath.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(edits);
            Files.writeString(editsPath, json, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to save edits: {}", editsPath, e);
            throw new RuntimeException("保存经文修改失败: " + e.getMessage(), e);
        }
    }

    private static String get(CSVRecord record, String name) {
        try {
            String value = record.get(name);
            return value == null ? "" : value.replace("\uFEFF", "").trim();
        } catch (Exception e) {
            return "";
        }
    }

    private static int parseInt(CSVRecord record, String name) {
        try {
            String value = get(record, name);
            if (value.isEmpty()) {
                return 0;
            }
            return Integer.parseInt(value.replaceAll("\\s+", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    public List<BookChapterItem> listBookChapters() {
        if (verses == null) return List.of();
        return verses.stream()
            .collect(Collectors.groupingBy(v -> v.getCovenantName() + "\t" + v.getBookName() + "\t" + v.getChapterNumber()))
            .keySet()
            .stream()
            .map(key -> {
                String[] parts = key.split("\t", 3);
                String covenant = parts.length > 0 ? parts[0] : "";
                String book = parts.length > 1 ? parts[1] : "";
                int chapter = 0;
                if (parts.length > 2) {
                    try {
                        chapter = Integer.parseInt(parts[2].trim());
                    } catch (NumberFormatException ignored) {
                    }
                }
                return new BookChapterItem(covenant, book, chapter);
            })
            .sorted(Comparator
                .comparing(BookChapterItem::getCovenantName, Comparator.nullsLast(String::compareTo))
                .thenComparing(BookChapterItem::getBookName, Comparator.nullsLast(String::compareTo))
                .thenComparing(BookChapterItem::getChapterNumber))
            .collect(Collectors.toList());
    }

    public VerseQueryResult queryVerses(String book, Integer chapter, String keyword, int pageSize, String startCursor) {
        List<BibleVerseDto> filtered = verses.stream()
            .filter(v -> book == null || book.isBlank() || book.equals(v.getBookName()))
            .filter(v -> chapter == null || v.getChapterNumber() == chapter)
            .filter(v -> matchesKeyword(v.getContent(), keyword))
            .sorted(Comparator
                .comparing(BibleVerseDto::getBookNumber)
                .thenComparing(BibleVerseDto::getChapterNumber)
                .thenComparing(BibleVerseDto::getVerseNumber))
            .collect(Collectors.toList());

        int offset = 0;
        if (startCursor != null && !startCursor.isBlank()) {
            try {
                offset = Integer.parseInt(startCursor);
            } catch (NumberFormatException ignored) {
            }
        }
        offset = Math.max(0, Math.min(offset, filtered.size()));
        int end = Math.min(offset + Math.max(1, pageSize), filtered.size());

        VerseQueryResult result = new VerseQueryResult();
        result.setVerses(filtered.subList(offset, end));
        result.setHasMore(end < filtered.size());
        result.setNextCursor(result.isHasMore() ? String.valueOf(end) : null);
        return result;
    }

    public Optional<BibleVerseDto> getVerseById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        return verses.stream().filter(v -> id.equals(v.getId())).findFirst();
    }

    public synchronized BibleVerseDto createVerse(BibleVerseDto dto) {
        String id = "edit-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        dto.setId(id);
        normalizeVerse(dto);
        verses.add(dto);
        edits.getCreated().add(dto);
        saveEdits();
        return dto;
    }

    public synchronized BibleVerseDto updateVerse(String id, BibleVerseDto dto) {
        dto.setId(id);
        normalizeVerse(dto);
        for (int i = 0; i < verses.size(); i++) {
            if (id.equals(verses.get(i).getId())) {
                verses.set(i, dto);
                if (id.startsWith("edit-")) {
                    edits.getCreated().removeIf(v -> id.equals(v.getId()));
                    edits.getCreated().add(dto);
                } else {
                    edits.getUpdated().removeIf(v -> id.equals(v.getId()));
                    edits.getUpdated().add(dto);
                }
                saveEdits();
                return dto;
            }
        }
        throw new IllegalArgumentException("经文不存在: " + id);
    }

    public synchronized void deleteVerse(String id) {
        if (id == null || id.isBlank()) {
            return;
        }
        verses.removeIf(v -> id.equals(v.getId()));
        if (!edits.getDeletedIds().contains(id)) {
            edits.getDeletedIds().add(id);
        }
        edits.getCreated().removeIf(v -> id.equals(v.getId()));
        edits.getUpdated().removeIf(v -> id.equals(v.getId()));
        saveEdits();
    }

    public synchronized BibleUserNotesDto getUserNotes(String username) {
        BibleUserNotesDto result = new BibleUserNotesDto();
        String normalizedUsername = normalizeUsername(username);
        boolean authenticated = normalizedUsername != null;
        result.setAuthenticated(authenticated);
        result.setUsername(authenticated ? normalizedUsername : "");
        result.setNotes(authenticated ? readUserNotes(normalizedUsername) : new ArrayList<>());
        return result;
    }

    public synchronized BibleVerseNoteDto saveUserNote(String username, BibleVerseNoteDto dto) {
        String normalizedUsername = requireUsername(username);
        BibleVerseNoteDto normalizedNote = normalizeNote(dto);
        List<BibleVerseNoteDto> notes = readUserNotes(normalizedUsername);
        notes.removeIf(item -> normalizedNote.getKey().equals(item.getKey()));
        notes.add(normalizedNote);
        writeUserNotes(normalizedUsername, notes);
        return normalizedNote;
    }

    public synchronized void deleteUserNote(String username, String bookName, int chapterNumber, int verseNumber) {
        String normalizedUsername = requireUsername(username);
        String key = buildVerseNoteKey(bookName, chapterNumber, verseNumber);
        List<BibleVerseNoteDto> notes = readUserNotes(normalizedUsername);
        notes.removeIf(item -> key.equals(item.getKey()));
        writeUserNotes(normalizedUsername, notes);
    }

    public synchronized void deleteUserNoteByKey(String username, String key) {
        String normalizedUsername = requireUsername(username);
        String normalizedKey = key == null ? "" : key.trim();
        if (normalizedKey.isBlank()) {
            throw new IllegalArgumentException("Note key is required");
        }

        List<BibleVerseNoteDto> notes = readUserNotes(normalizedUsername);
        notes.removeIf(item -> normalizedKey.equals(item.getKey()));
        writeUserNotes(normalizedUsername, notes);
    }

    public synchronized List<BibleVerseNoteDto> importUserNotes(String username, List<BibleVerseNoteDto> incoming) {
        String normalizedUsername = requireUsername(username);
        List<BibleVerseNoteDto> notes = readUserNotes(normalizedUsername);
        for (BibleVerseNoteDto item : incoming == null ? List.<BibleVerseNoteDto>of() : incoming) {
            try {
                BibleVerseNoteDto normalized = normalizeNote(item);
                notes.removeIf(existing -> normalized.getKey().equals(existing.getKey()));
                notes.add(normalized);
            } catch (IllegalArgumentException ignored) {
            }
        }
        writeUserNotes(normalizedUsername, notes);
        return readUserNotes(normalizedUsername);
    }

    private List<BibleVerseNoteDto> readUserNotes(String username) {
        Path path = resolveUserNotesPath(username);
        if (path == null || !Files.isRegularFile(path)) {
            return new ArrayList<>();
        }

        try {
            String json = Files.readString(path, StandardCharsets.UTF_8);
            List<BibleVerseNoteDto> loaded = objectMapper.readerForListOf(BibleVerseNoteDto.class).readValue(json);
            List<BibleVerseNoteDto> normalized = new ArrayList<>();
            for (BibleVerseNoteDto item : loaded) {
                try {
                    normalized.add(normalizeNote(item));
                } catch (IllegalArgumentException ignored) {
                }
            }
            return sortNotes(normalized);
        } catch (Exception e) {
            log.warn("Failed to read bible notes for user {}", username, e);
            return new ArrayList<>();
        }
    }

    private void writeUserNotes(String username, List<BibleVerseNoteDto> notes) {
        Path path = resolveUserNotesPath(username);
        if (path == null) {
            return;
        }

        try {
            Path parent = path.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(sortNotes(notes));
            Files.writeString(path, json, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to save bible notes for user {}", username, e);
            throw new RuntimeException("Failed to save bible notes: " + e.getMessage(), e);
        }
    }

    private Path resolveUserNotesPath(String username) {
        String normalizedUsername = requireUsername(username);
        if (notesDir == null) {
            resolveEditsPath();
            resolveNotesDir();
        }
        String fileName = Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(normalizedUsername.getBytes(StandardCharsets.UTF_8));
        return notesDir.resolve(fileName + ".json");
    }

    private String requireUsername(String username) {
        String normalizedUsername = normalizeUsername(username);
        if (normalizedUsername == null) {
            throw new IllegalArgumentException("Current user is not authenticated");
        }
        return normalizedUsername;
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return username.trim();
    }

    private BibleVerseNoteDto normalizeNote(BibleVerseNoteDto source) {
        if (source == null) {
            throw new IllegalArgumentException("Note payload is required");
        }

        String bookName = source.getBookName() == null ? "" : source.getBookName().trim();
        int chapterNumber = Math.max(source.getChapterNumber(), 0);
        int verseNumber = Math.max(source.getVerseNumber(), 0);
        String html = source.getHtml() == null ? "" : source.getHtml().trim();
        if (bookName.isBlank() || chapterNumber <= 0 || verseNumber <= 0) {
            throw new IllegalArgumentException("Verse location is required");
        }
        if (html.isBlank()) {
            throw new IllegalArgumentException("Note content is required");
        }
        if (html.length() > 40000) {
            throw new IllegalArgumentException("Note content is too long");
        }

        BibleVerseNoteDto normalized = new BibleVerseNoteDto();
        normalized.setBookName(bookName);
        normalized.setCovenantName(source.getCovenantName() == null ? "" : source.getCovenantName().trim());
        normalized.setChapterNumber(chapterNumber);
        normalized.setVerseNumber(verseNumber);
        normalized.setHtml(html);
        normalized.setKey(buildVerseNoteKey(bookName, chapterNumber, verseNumber));
        normalized.setUpdatedAt(
            source.getUpdatedAt() == null || source.getUpdatedAt().isBlank()
                ? Instant.now().toString()
                : source.getUpdatedAt().trim()
        );
        return normalized;
    }

    private String buildVerseNoteKey(String bookName, int chapterNumber, int verseNumber) {
        String normalizedBookName = bookName == null ? "" : bookName.trim();
        return normalizedBookName + "__" + chapterNumber + "__" + verseNumber;
    }

    private List<BibleVerseNoteDto> sortNotes(List<BibleVerseNoteDto> notes) {
        return notes.stream()
            .filter(item -> item != null && item.getKey() != null && !item.getKey().isBlank())
            .sorted(Comparator
                .comparing(BibleVerseNoteDto::getBookName, Comparator.nullsLast(String::compareTo))
                .thenComparingInt(BibleVerseNoteDto::getChapterNumber)
                .thenComparingInt(BibleVerseNoteDto::getVerseNumber))
            .collect(Collectors.toCollection(ArrayList::new));
    }

    public BibleDiagnosticsDto getDiagnostics() {
        BibleDiagnosticsDto dto = new BibleDiagnosticsDto();
        dto.setSourceMode(sourceMode);
        dto.setSourceDetail(sourceDetail);
        dto.setVerseCount(verses.size());
        dto.setChapterCount(listBookChapters().size());
        dto.setDeletedCount(edits.getDeletedIds().size());
        dto.setUpdatedCount(edits.getUpdated().size());
        dto.setCreatedCount(edits.getCreated().size());
        dto.setEditsPath(editsPath == null ? "" : editsPath.toString());
        dto.setConfigPath(configPath == null ? "" : configPath.toString());
        dto.setLastReloadAt(lastReloadAt);
        dto.setLastError(lastError);
        dto.setFloatEnabled(cachedSetting.isFloatEnabled());
        dto.setFloatPosition(cachedSetting.getFloatPosition());
        dto.setVisiblePages(cachedSetting.getVisiblePages());
        return dto;
    }

    public BibleThemePayload getThemePayload() {
        BibleThemePayload payload = new BibleThemePayload();
        payload.setSettings(getSettings());
        payload.setEdits(copyEdits());
        payload.setBuiltinCsvPath(BUILTIN_CSV_PATH);
        payload.setDefaultIconUrl(DEFAULT_ICON_URL);
        return payload;
    }

    public BibleEditsDto copyEdits() {
        BibleEditsDto snapshot = new BibleEditsDto();
        snapshot.setDeletedIds(new ArrayList<>(edits.getDeletedIds()));
        snapshot.setUpdated(new ArrayList<>(edits.getUpdated()));
        snapshot.setCreated(new ArrayList<>(edits.getCreated()));
        return snapshot;
    }

    private void normalizeVerse(BibleVerseDto dto) {
        if (dto.getCovenantName() == null) dto.setCovenantName("");
        if (dto.getCategory() == null) dto.setCategory("");
        if (dto.getBookName() == null) dto.setBookName("");
        if (dto.getContent() == null) dto.setContent("");
    }

    private boolean matchesKeyword(String content, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        if (content == null || content.isBlank()) {
            return false;
        }
        String normalized = content.toLowerCase(Locale.ROOT);
        for (String token : splitKeyword(keyword)) {
            if (!normalized.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private List<String> splitKeyword(String keyword) {
        return Arrays.stream(keyword.trim().toLowerCase(Locale.ROOT).split("\\s+"))
            .map(String::trim)
            .filter(token -> !token.isEmpty())
            .distinct()
            .toList();
    }
}
