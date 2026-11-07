package example;

import io.github.bropines.glossa.Glossa;
import io.github.bropines.glossa.GlossaModule;
import io.github.bropines.glossa.Host;
import io.github.bropines.glossa.Json;
import io.github.bropines.glossa.ModuleError;
import io.github.bropines.glossa.Request;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A Glossa translator module in Java.
 *
 * <p>Glossa calls {@link #translate} with {@code text}, {@code from}, {@code to} and the module's
 * {@code options}, and expects {@code {"text", "detected_from"?}} back (docs/modules/protocol.md).
 * The SDK reference is sdk/java/README.md in the Glossa repository.
 */
public final class ExampleTranslator implements GlossaModule {
    private static final String API_URL = "https://api.example.com/v1/translate";

    @Override
    public Object translate(Request req, Host host) throws Exception {
        // An empty required setting: Glossa tells the user to fill in api_key.
        String key = req.requireOption("api_key");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", req.text());
        body.put("source", "auto".equals(req.from()) ? null : req.from());
        body.put("target", req.to());

        // The http host call goes through Glossa: the user's proxy, the module's
        // network permissions, and a recording in tests. A timeout below Glossa's
        // 30 s budget makes a slow service fail with a clear error.
        Host.HttpResponse r = host.http(Json.obj(
                "method", "POST",
                "url", API_URL,
                "headers", Json.obj("Authorization", "Bearer " + key, "Content-Type", "application/json"),
                "body", Json.write(body),
                "timeout_ms", 15000));

        // A non-2xx status is returned, not thrown: map it to a typed error.
        int status = r.status();
        if (status == 401 || status == 403) {
            throw ModuleError.missingCredential("api_key");
        }
        if (status == 429) {
            throw new ModuleError("rate_limited", "the Example API asks to slow down");
        }
        if (!r.ok()) {
            throw new ModuleError("http", "the Example API answered " + status);
        }

        Map<String, Object> data;
        try {
            data = Json.asMap(Json.parse(r.body()));
        } catch (RuntimeException e) {
            throw ModuleError.badResponse("the answer is not JSON");
        }
        String translation = Json.string(data, "translation", "");
        if (translation.isEmpty()) {
            throw ModuleError.badResponse("no translation in the answer");
        }
        host.debug("translated " + req.text().length() + " characters");
        return Json.obj("text", translation, "detected_from", Json.string(data, "detected_source", null));
    }

    public static void main(String[] args) {
        Glossa.run(new ExampleTranslator());
    }
}
