import { NextResponse } from "next/server";

// AEMET station for Ourense: 1690A
const STATION_ID = "1690A";

export async function GET() {
  const key = process.env.AEMET_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "AEMET_API_KEY not set" }, { status: 500 });
  }

  try {
    // Step 1: Request observation data URL
    const metaRes = await fetch(
      `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${STATION_ID}`,
      {
        headers: { api_key: key },
        next: { revalidate: 1800 }, // cache 30min
      }
    );

    const meta = await metaRes.json();

    if (meta.estado !== 200 || !meta.datos) {
      // Fallback: try prediction endpoint
      return await getForecast(key);
    }

    // Step 2: Fetch actual data from the URL returned
    const dataRes = await fetch(meta.datos);
    const observations = await dataRes.json();

    if (!Array.isArray(observations) || observations.length === 0) {
      return await getForecast(key);
    }

    // Get the latest observation
    const latest = observations[observations.length - 1];

    const weather = {
      temperature: latest.ta ?? latest.tamin ?? null,
      humidity: latest.hr ?? null,
      windSpeed: latest.vv ? Math.round(latest.vv * 3.6) : null, // m/s to km/h
      windDirection: latest.dv ? degreesToDirection(latest.dv) : null,
      precipitation: latest.prec ?? 0,
      pressure: latest.pres ?? null,
      lastUpdated: latest.fint || new Date().toISOString(),
      source: "AEMET Observation",
      station: STATION_ID,
    };

    return NextResponse.json(weather);
  } catch (err) {
    console.error("AEMET API error:", err);
    return await getFallback();
  }
}

async function getForecast(key: string) {
  try {
    // Ourense municipality code: 32054
    const metaRes = await fetch(
      `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/32054`,
      {
        headers: { api_key: key },
        next: { revalidate: 3600 },
      }
    );
    const meta = await metaRes.json();

    if (meta.estado !== 200 || !meta.datos) {
      return await getFallback();
    }

    const dataRes = await fetch(meta.datos);
    const forecast = await dataRes.json();

    if (!Array.isArray(forecast) || forecast.length === 0) {
      return await getFallback();
    }

    const today = forecast[0].prediccion?.dia?.[0];
    if (!today) return await getFallback();

    const tempMax = today.temperatura?.maxima ?? null;
    const tempMin = today.temperatura?.minima ?? null;
    const humidity = today.humedadRelativa?.minima ?? null;

    return NextResponse.json({
      temperature: tempMax,
      temperatureMin: tempMin,
      humidity,
      windSpeed: null,
      windDirection: null,
      precipitation: today.probPrecipitacion?.[0]?.value ?? 0,
      lastUpdated: forecast[0].elaborado || new Date().toISOString(),
      source: "AEMET Forecast",
      station: "Ourense (32054)",
    });
  } catch {
    return await getFallback();
  }
}

async function getFallback() {
  return NextResponse.json({
    temperature: null,
    humidity: null,
    windSpeed: null,
    windDirection: null,
    precipitation: null,
    lastUpdated: new Date().toISOString(),
    source: "Unavailable",
    error: "Could not fetch AEMET data",
  });
}

function degreesToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}
