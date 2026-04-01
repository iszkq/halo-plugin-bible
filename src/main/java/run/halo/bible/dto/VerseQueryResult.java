package run.halo.bible.dto;

import java.util.List;
import lombok.Data;

@Data
public class VerseQueryResult {

    private List<BibleVerseDto> verses;
    private String nextCursor;
    private boolean hasMore;
}
