import launchEditor from "launch-editor";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const fileName = searchParams.get("fileName");
    const lineNumber = searchParams.get("lineNumber") ?? "1";
    const colNumber = searchParams.get("colNumber") ?? "1";

    if (!fileName) {
        return NextResponse.json(
            { error: "fileName is required" },
            { status: 400 },
        );
    }

    launchEditor(`${fileName}:${lineNumber}:${colNumber}`);

    return NextResponse.json({ success: true });
}
