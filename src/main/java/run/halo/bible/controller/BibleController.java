package run.halo.bible.controller;

import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import run.halo.app.plugin.ApiVersion;
import run.halo.bible.dto.BibleDiagnosticsDto;
import run.halo.bible.dto.BibleSetting;
import run.halo.bible.dto.BibleUserNotesDto;
import run.halo.bible.dto.BibleVerseNoteDto;
import run.halo.bible.dto.BibleVerseDto;
import run.halo.bible.dto.BookChapterItem;
import run.halo.bible.dto.VerseQueryResult;
import run.halo.bible.service.CsvBibleService;

@ApiVersion("v1alpha1")
@RestController
@RequestMapping("bible")
@RequiredArgsConstructor
public class BibleController {

    private final CsvBibleService csvBibleService;

    @GetMapping("/settings")
    public BibleSetting getSettings() {
        return csvBibleService.getSettings();
    }

    @PutMapping("/settings")
    public ResponseEntity<BibleSetting> saveSettings(@RequestBody BibleSetting setting) {
        csvBibleService.saveSettingsAndReload(setting);
        return ResponseEntity.ok(csvBibleService.getSettings());
    }

    @GetMapping("/diagnostics")
    public BibleDiagnosticsDto getDiagnostics() {
        return csvBibleService.getDiagnostics();
    }

    @GetMapping("/book-chapters")
    public List<BookChapterItem> getBookChapters() {
        return csvBibleService.listBookChapters();
    }

    @GetMapping("/verses")
    public VerseQueryResult getVerses(
        @RequestParam(required = false) String book,
        @RequestParam(required = false) Integer chapter,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "50") int pageSize,
        @RequestParam(required = false) String startCursor
    ) {
        return csvBibleService.queryVerses(book, chapter, keyword, Math.min(pageSize, 50000), startCursor);
    }

    @GetMapping("/verses/{id}")
    public ResponseEntity<BibleVerseDto> getVerseById(@PathVariable String id) {
        return csvBibleService.getVerseById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/verses")
    public ResponseEntity<BibleVerseDto> createVerse(@RequestBody BibleVerseDto dto) {
        BibleVerseDto created = csvBibleService.createVerse(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/verses/{id}")
    public ResponseEntity<BibleVerseDto> updateVerse(@PathVariable String id, @RequestBody BibleVerseDto dto) {
        try {
            return ResponseEntity.ok(csvBibleService.updateVerse(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/verses/{id}")
    public ResponseEntity<Void> deleteVerse(@PathVariable String id) {
        csvBibleService.deleteVerse(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notes/me")
    public BibleUserNotesDto getCurrentUserNotes(Principal principal) {
        return csvBibleService.getUserNotes(principal != null ? principal.getName() : null);
    }

    @PutMapping("/notes/me")
    public ResponseEntity<BibleVerseNoteDto> saveCurrentUserNote(
        @RequestBody BibleVerseNoteDto dto,
        Principal principal
    ) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            return ResponseEntity.ok(csvBibleService.saveUserNote(principal.getName(), dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/notes/me")
    public ResponseEntity<Void> deleteCurrentUserNote(
        @RequestParam String bookName,
        @RequestParam int chapterNumber,
        @RequestParam int verseNumber,
        Principal principal
    ) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        csvBibleService.deleteUserNote(principal.getName(), bookName, chapterNumber, verseNumber);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notes/me/delete")
    public ResponseEntity<Void> deleteCurrentUserNoteByKey(
        @RequestBody BibleVerseNoteDto dto,
        Principal principal
    ) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            csvBibleService.deleteUserNoteByKey(principal.getName(), dto != null ? dto.getKey() : null);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/notes/me/import")
    public ResponseEntity<BibleUserNotesDto> importCurrentUserNotes(
        @RequestBody List<BibleVerseNoteDto> notes,
        Principal principal
    ) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        csvBibleService.importUserNotes(principal.getName(), notes);
        return ResponseEntity.ok(csvBibleService.getUserNotes(principal.getName()));
    }
}
