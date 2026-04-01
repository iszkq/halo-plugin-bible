package run.halo.bible.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

/**
 * 用户对经文的增删改持久化结构。
 */
@Data
public class BibleEditsDto {

    private List<String> deletedIds = new ArrayList<>();
    private List<BibleVerseDto> updated = new ArrayList<>();
    private List<BibleVerseDto> created = new ArrayList<>();
}
