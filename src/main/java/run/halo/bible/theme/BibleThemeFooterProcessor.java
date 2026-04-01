package run.halo.bible.theme;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IProcessableElementTag;
import org.thymeleaf.model.IModel;
import org.thymeleaf.processor.element.IElementTagStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.theme.dialect.TemplateFooterProcessor;
import run.halo.bible.service.CsvBibleService;

@Component
@RequiredArgsConstructor
public class BibleThemeFooterProcessor implements TemplateFooterProcessor {

    private final CsvBibleService csvBibleService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> process(
        ITemplateContext context,
        IProcessableElementTag tag,
        IElementTagStructureHandler structureHandler,
        IModel model
    ) {
        var payload = csvBibleService.getThemePayload();
        var factory = context.getModelFactory();
        var assetVersion = resolveAssetVersion();
        model.add(factory.createText("<link rel=\"stylesheet\" href=\"/plugins/bible/assets/theme-bible-widget.css?v=" + assetVersion + "\">"));
        if (!payload.getSettings().isFloatEnabled()) {
            return Mono.empty();
        }
        model.add(factory.createText("<script>window.__BIBLE_PLUGIN_THEME__=" + toJson(payload) + ";</script>"));
        model.add(factory.createText("<script defer src=\"/plugins/bible/assets/theme-bible-widget.js?v=" + assetVersion + "\"></script>"));
        return Mono.empty();
    }

    private String resolveAssetVersion() {
        var pkg = BibleThemeFooterProcessor.class.getPackage();
        var version = pkg != null ? pkg.getImplementationVersion() : null;
        return version != null && !version.isBlank() ? version : "dev";
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload).replace("</", "<\\/");
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
