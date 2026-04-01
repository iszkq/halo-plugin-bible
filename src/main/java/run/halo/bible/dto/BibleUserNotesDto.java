package run.halo.bible.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class BibleUserNotesDto {

    private boolean authenticated;
    private String username;
    private List<BibleVerseNoteDto> notes = new ArrayList<>();
}
